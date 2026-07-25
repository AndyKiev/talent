
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.app_setting.app_setting_service import get_int_setting
from backend.api_v1.audit.change_log.change_log_schema import ChangeAction
from backend.api_v1.base.base_service import BaseService
from backend.api_v1.base.mutation_response import MutationResponse
from backend.api_v1.employee.employee_schema import EmployeeSchema
from backend.api_v1.employee_mission.employee_mission_access import (
    EmployeeMissionAccess,
)
from backend.api_v1.employee_mission.employee_mission_messages import (
    EmployeeMissionNotFound,
    MissionMaxKpisReached,
)
from backend.api_v1.employee_mission.employee_mission_model import EmployeeMission
from backend.api_v1.employee_mission.employee_mission_schema import (
    EmployeeMissionKpiSchema,
)
from backend.api_v1.employee_mission.employee_mission_service import (
    DEFAULT_MAX_KPIS,
    KPI_SORT_STEP,
)
from backend.api_v1.employee_mission.mission_audit import MissionAudit
from backend.api_v1.employee_mission_kpi.employee_mission_kpi_messages import (
    EmployeeMissionKpiCreateSuccess,
    EmployeeMissionKpiDeleteSuccess,
    EmployeeMissionKpiNotFound,
    EmployeeMissionKpiUpdateSuccess,
    MissionKpiTextTooLong,
    MissionLastKpiRequired,
)
from backend.api_v1.employee_mission_kpi.employee_mission_kpi_repository import (
    EmployeeMissionKpiRepository,
)
from backend.api_v1.employee_mission_kpi.employee_mission_kpi_schema import (
    EmployeeMissionKpiCreate,
    EmployeeMissionKpiUpdate,
)
from backend.utils.enums import OperationVerb

# Fallback when the app setting row is missing. Mirrors seed_app_settings.
DEFAULT_KPI_MAX_LENGTH = 126


class EmployeeMissionKpiService(BaseService):
    """
    KPIs under a development mission.

    Two rules justify this service existing at all:
      1. a mission must keep AT LEAST ONE KPI (delete half of the rule);
      2. only the employee's oversight manager (or admin) may write — and the
         routes here are keyed by kpi_id, with no employee_id in the path, so the
         check has to resolve kpi -> mission -> employee_id first.
    """

    def __init__(
        self,
        repository: EmployeeMissionKpiRepository,
        user: EmployeeSchema | None = None,
        session: AsyncSession | None = None,
    ) -> None:
        super().__init__(repository, user=user, session=session)
        self.access = EmployeeMissionAccess(user=user, session=session)
        self.audit = MissionAudit(user=user, session=session)

    # ── helpers ──────────────────────────────────────────────────────────────

    async def _mission_employee_id(self, mission_id: int) -> int:
        """Column-only lookup: the permission check needs the owner id, not the
        mission entity with its selectin children."""
        employee_id = await self.session.scalar(
            select(EmployeeMission.employee_id).where(EmployeeMission.id == mission_id)
        )
        if employee_id is None:
            raise await self._resolve_domain_error(EmployeeMissionNotFound(mission_id))
        return employee_id

    async def _get_kpi_or_404(self, kpi_id: int):
        record = await self.repository.get_by_id(kpi_id)
        if not record:
            raise await self._resolve_domain_error(EmployeeMissionKpiNotFound(kpi_id))
        return record

    async def _validate_text(self, text: str) -> None:
        max_length = await get_int_setting(
            self.session, "idp_kpi_max_length", default=DEFAULT_KPI_MAX_LENGTH
        )
        if len(text) > max_length:
            raise await self._resolve_domain_error(MissionKpiTextTooLong(max_length))

    async def _resync_mission_status(self, mission_id: int) -> None:
        """Re-derive the parent mission's status after a KPI write.

        Status is a function of the KPI percentages, so every path that can move
        one has to run this or the stored status goes stale — that includes
        creating a KPI (which can drop a completed mission back to in_process)
        and deleting one (which can complete it).
        """
        from backend.api_v1.employee_mission.employee_mission_repository import (
            EmployeeMissionRepository,
        )
        from backend.api_v1.employee_mission.employee_mission_service import (
            EmployeeMissionService,
        )

        service = EmployeeMissionService(
            repository=EmployeeMissionRepository(session=self.session),
            user=self.user,
            session=self.session,
        )
        # Share the audit run so the status change lands in the SAME change_session
        # as the KPI edit that caused it.
        service.audit = self.audit
        mission = await service.repository.get_by_id(mission_id)
        if mission is not None:
            await self.session.refresh(mission, ["kpis"])
            await service.apply_status(mission)

    # ── writes ───────────────────────────────────────────────────────────────

    async def create_kpi(
        self, mission_id: int, payload: EmployeeMissionKpiCreate
    ) -> MutationResponse[EmployeeMissionKpiSchema]:
        employee_id = await self._mission_employee_id(mission_id)
        await self.access.assert_can_manage(employee_id, OperationVerb.CREATE)
        await self._validate_text(payload.text)

        # Same cap the create-mission path enforces, applied to the add-one path
        # so a mission cannot exceed it by growing after creation.
        cap = await get_int_setting(
            self.session, "mission_max_kpis", default=DEFAULT_MAX_KPIS
        )
        if await self.repository.count_for_mission(mission_id) >= cap:
            raise await self._resolve_domain_error(MissionMaxKpisReached(cap))

        next_order = await self.repository.max_sort_order(mission_id) + KPI_SORT_STEP
        kpi = self.repository.model(
            mission_id=mission_id,
            text=payload.text,
            percent=0,
            sort_order=next_order,
        )
        self.session.add(kpi)
        await self.session.flush()

        await self.audit.log_kpi(
            kpi_id=kpi.id,
            employee_id=employee_id,
            action=ChangeAction.CREATE,
            changes={
                "text": {"old": None, "new": kpi.text},
                "percent": {"old": None, "new": 0},
            },
        )
        await self._resync_mission_status(mission_id)
        await self.session.commit()

        schema = EmployeeMissionKpiSchema.model_validate(kpi)
        detail = await self._resolve_domain_success(EmployeeMissionKpiCreateSuccess())
        return MutationResponse(detail=detail, data=schema)

    async def update_kpi(
        self, kpi_id: int, payload: EmployeeMissionKpiUpdate
    ) -> MutationResponse[EmployeeMissionKpiSchema]:
        """Edit the text and/or set the fulfilment percentage.

        Both go through the same oversight-manager gate: a fulfilment figure is an
        assessment of the employee, so it must never be self-serve.
        """
        record = await self._get_kpi_or_404(kpi_id)
        employee_id = await self._mission_employee_id(record.mission_id)
        await self.access.assert_can_manage(employee_id, OperationVerb.MODIFY)

        data = payload.model_dump(exclude_unset=True)
        if "text" in data:
            await self._validate_text(data["text"])

        changes: dict = {}
        for field, new_value in data.items():
            old_value = getattr(record, field)
            if old_value == new_value:
                continue
            setattr(record, field, new_value)
            changes[field] = {"old": old_value, "new": new_value}

        if changes:
            await self.audit.log_kpi(
                kpi_id=record.id,
                employee_id=employee_id,
                action=ChangeAction.UPDATE,
                changes=changes,
            )
        if "percent" in changes:
            await self._resync_mission_status(record.mission_id)
        await self.session.commit()

        schema = EmployeeMissionKpiSchema.model_validate(record)
        detail = await self._resolve_domain_success(EmployeeMissionKpiUpdateSuccess())
        return MutationResponse(detail=detail, data=schema)

    async def delete_kpi(self, kpi_id: int) -> str:
        """Refuses to remove a mission's last KPI — deleting the whole mission is
        the deliberate way to get rid of it."""
        record = await self._get_kpi_or_404(kpi_id)
        employee_id = await self._mission_employee_id(record.mission_id)
        await self.access.assert_can_manage(employee_id, OperationVerb.DELETE)

        if await self.repository.count_for_mission(record.mission_id) <= 1:
            raise await self._resolve_domain_error(MissionLastKpiRequired())

        await self.audit.log_kpi(
            kpi_id=record.id,
            employee_id=employee_id,
            action=ChangeAction.DELETE,
            changes={
                "text": {"old": record.text, "new": None},
                "percent": {"old": record.percent, "new": None},
            },
        )
        mission_id = record.mission_id
        await self.session.delete(record)
        await self.session.flush()
        await self._resync_mission_status(mission_id)
        await self.session.commit()
        return await self._resolve_domain_success(EmployeeMissionKpiDeleteSuccess())

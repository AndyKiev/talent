
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.base.base_service import BaseService
from backend.api_v1.base.mutation_response import MutationResponse
from backend.api_v1.employee.employee_schema import EmployeeSchema
from backend.api_v1.planning.plan_scope.plan_scope_messages import (
    PlanScopeDeleteError,
    PlanScopeDeleteSuccess,
    PlanScopeInactive,
    PlanScopeNotFound,
    PlanScopeSessionClosed,
    PlanScopeSessionPending,
    PlanScopeUpdateSuccess,
)
from backend.api_v1.planning.plan_scope.plan_scope_repository import PlanScopeRepository
from backend.api_v1.planning.plan_scope.plan_scope_schema import (
    PlanScope as PlanScopeSchema,
)
from backend.api_v1.planning.plan_scope.plan_scope_schema import (
    PlanScopeUpdate,
)
from backend.api_v1.planning.plan_session.plan_session_repository import (
    PlanSessionRepository,
)
from backend.api_v1.planning.plan_session_status.plan_session_status_repository import (
    PlanSessionStatusRepository,
)
from backend.api_v1.region.region_schema import RegionSlim
from backend.utils.enums import PlanSessionStatusKey


def _scope_label(schema: PlanScopeSchema) -> str:
    dept = schema.department.name if schema.department else str(schema.department_id)
    jg = schema.job_group.name if schema.job_group else str(schema.job_group_id)
    ts = schema.talent_status.key if schema.talent_status else "all"
    return f"{dept} / {jg} / {ts}"


class PlanScopeService(BaseService):
    def __init__(
        self,
        repository: PlanScopeRepository,
        user: EmployeeSchema | None = None,
        session: AsyncSession | None = None,
    ):
        super().__init__(repository, user=user, session=session)
        # Sibling repositories share the same AsyncSession
        self.session_repo = PlanSessionRepository(session=session)
        self.status_repo = PlanSessionStatusRepository(session=session)

    async def get_by_id(self, id: int) -> PlanScopeSchema:
        result = await self.repository.get_by_id(id)
        if not result:
            raise await self._resolve_domain_error(PlanScopeNotFound(id))
        return result

    async def get_scopes_by_session(
        self, plan_session_id: int
    ) -> list[PlanScopeSchema]:
        records = await self.repository.get_by_session(plan_session_id)
        dept_ids = {r.department_id for r in records}
        region_map = await self.repository.get_region_map(dept_ids)
        out: list[PlanScopeSchema] = []
        for r in records:
            schema = PlanScopeSchema.model_validate(r)
            region = region_map.get(r.department_id)
            if region:
                schema.region = RegionSlim.model_validate(region)
            out.append(schema)
        return out

    async def _guard_session_open(self, plan_session_id: int) -> None:
        """Allow edits only when the parent session status key == 'open'."""
        session_row = await self.session_repo.get_by_id(plan_session_id)
        status_row = await self.status_repo.get_by_id(
            session_row.plan_session_status_id
        )
        session_name = session_row.name
        if status_row.key == PlanSessionStatusKey.PENDING.value:
            raise await self._resolve_domain_error(
                PlanScopeSessionPending(session_name)
            )
        if status_row.key == PlanSessionStatusKey.CLOSED.value:
            raise await self._resolve_domain_error(PlanScopeSessionClosed(session_name))

    async def update_plan_scope(
        self, scope_id: int, scope_update: PlanScopeUpdate
    ) -> MutationResponse[PlanScopeSchema]:
        orm_record = await self.get_by_id(scope_id)
        await self._guard_session_open(orm_record.plan_session_id)
        if not orm_record.is_active:
            raise await self._resolve_domain_error(
                PlanScopeInactive(
                    _scope_label(PlanScopeSchema.model_validate(orm_record))
                )
            )
        updated = await self.update(orm_record, scope_update, partial=True)
        schema = PlanScopeSchema.model_validate(updated)
        detail = await self._resolve_domain_success(
            PlanScopeUpdateSuccess(_scope_label(schema))
        )
        return MutationResponse(detail=detail, data=schema)

    async def delete_plan_scope(self, scope_id: int) -> None:
        """Hard-delete a single scope row (open sessions only). If it still
        matches the config, a later re-sync will recreate it fresh."""
        orm_record = await self.get_by_id(scope_id)
        await self._guard_session_open(orm_record.plan_session_id)
        schema = PlanScopeSchema.model_validate(orm_record)
        await self.delete_by_id(
            scope_id,
            name=_scope_label(schema),
            delete_error_exc=PlanScopeDeleteError,
            delete_success_exc=PlanScopeDeleteSuccess,
        )

from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.audit.change_log.change_log_schema import ChangeAction
from backend.api_v1.base.base_service import BaseService
from backend.api_v1.base.mutation_response import MutationResponse
from backend.api_v1.employee.employee_schema import EmployeeSchema
from backend.api_v1.employee_mission.employee_mission_access import (
    EmployeeMissionAccess,
)
from backend.api_v1.employee_mission.employee_mission_messages import (
    EmployeeMissionNotFound,
    MissionDimensionNotFound,
)
from backend.api_v1.employee_mission.employee_mission_model import EmployeeMission
from backend.api_v1.employee_mission.mission_audit import MissionAudit
from backend.api_v1.employee_mission_dimension_link.employee_mission_dimension_link_messages import (
    MissionDimensionLinkClearSuccess,
    MissionDimensionLinkSetSuccess,
)
from backend.api_v1.employee_mission_dimension_link.employee_mission_dimension_link_repository import (
    EmployeeMissionDimensionLinkRepository,
)
from backend.api_v1.employee_mission_dimension_link.employee_mission_dimension_link_schema import (
    EmployeeMissionDimensionLinkSchema,
)
from backend.api_v1.review_dimension.review_dimension_model import ReviewDimension
from backend.utils.enums import OperationVerb


class EmployeeMissionDimensionLinkService(BaseService):
    """
    The mission's optional competence, as a 1:1 link.

    Deleting the mission or the competence needs no code here — both FKs are
    ON DELETE CASCADE, so the DB removes the row. What is left is the upsert, the
    deliberate clear, and the same oversight-manager gate the mission itself uses.
    """

    def __init__(
        self,
        repository: EmployeeMissionDimensionLinkRepository,
        user: Optional[EmployeeSchema] = None,
        session: Optional[AsyncSession] = None,
    ) -> None:
        super().__init__(repository, user=user, session=session)
        self.access = EmployeeMissionAccess(user=user, session=session)
        self.audit = MissionAudit(user=user, session=session)

    async def _mission_employee_id(self, mission_id: int) -> int:
        employee_id = await self.session.scalar(
            select(EmployeeMission.employee_id).where(EmployeeMission.id == mission_id)
        )
        if employee_id is None:
            raise await self._resolve_domain_error(EmployeeMissionNotFound(mission_id))
        return employee_id

    def _to_schema(self, record) -> Optional[EmployeeMissionDimensionLinkSchema]:
        if record is None:
            return None
        schema = EmployeeMissionDimensionLinkSchema.model_validate(record)
        if record.dimension is not None:
            schema.dimension_name = record.dimension.name
            schema.dimension_color = record.dimension.color
        return schema

    async def get_for_mission(
        self, mission_id: int
    ) -> Optional[EmployeeMissionDimensionLinkSchema]:
        """Scoped read — same reasoning as the comment service: mission_id-keyed
        routes carry no {employee_id} for the route guard, so the owner is
        resolved here and the read audience applied."""
        employee_id = await self._mission_employee_id(mission_id)
        await self.access.assert_can_read(employee_id)
        return self._to_schema(await self.repository.get_for_mission(mission_id))

    async def set_for_mission(
        self, mission_id: int, dimension_id: int
    ) -> MutationResponse[EmployeeMissionDimensionLinkSchema]:
        employee_id = await self._mission_employee_id(mission_id)
        await self.access.assert_can_manage(employee_id, OperationVerb.LINK)

        exists = await self.session.scalar(
            select(ReviewDimension.id).where(ReviewDimension.id == dimension_id)
        )
        if exists is None:
            raise await self._resolve_domain_error(
                MissionDimensionNotFound(dimension_id)
            )

        previous = await self.repository.get_for_mission(mission_id)
        old_id = previous.dimension_id if previous else None
        record = await self.repository.set_for_mission(mission_id, dimension_id)

        if old_id != dimension_id:
            await self.audit.log_mission(
                mission_id=mission_id,
                employee_id=employee_id,
                action=ChangeAction.UPDATE,
                changes={"dimension_id": {"old": old_id, "new": dimension_id}},
            )
        await self.session.commit()

        record = await self.repository.get_for_mission(mission_id)
        detail = await self._resolve_domain_success(MissionDimensionLinkSetSuccess())
        return MutationResponse(detail=detail, data=self._to_schema(record))

    async def clear_for_mission(self, mission_id: int) -> str:
        """Explicitly drop a mission's competence (the mission stays)."""
        employee_id = await self._mission_employee_id(mission_id)
        await self.access.assert_can_manage(employee_id, OperationVerb.LINK)

        previous = await self.repository.get_for_mission(mission_id)
        if await self.repository.clear_for_mission(mission_id):
            await self.audit.log_mission(
                mission_id=mission_id,
                employee_id=employee_id,
                action=ChangeAction.UPDATE,
                changes={
                    "dimension_id": {
                        "old": previous.dimension_id if previous else None,
                        "new": None,
                    }
                },
            )
        await self.session.commit()
        return await self._resolve_domain_success(MissionDimensionLinkClearSuccess())

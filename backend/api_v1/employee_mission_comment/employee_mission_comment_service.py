from typing import List, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.audit.change_log.change_log_schema import ChangeAction
from backend.api_v1.base.base_service import BaseService
from backend.api_v1.base.mutation_response import MutationResponse
from backend.api_v1.employee.employee_minis import fetch_employee_minis
from backend.api_v1.employee.employee_schema import EmployeeSchema
from backend.api_v1.employee_mission.employee_mission_access import (
    EmployeeMissionAccess,
)
from backend.api_v1.employee_mission.employee_mission_messages import (
    EmployeeMissionNotFound,
)
from backend.api_v1.employee_mission.employee_mission_model import EmployeeMission
from backend.api_v1.employee_mission.employee_mission_schema import (
    EmployeeMissionCommentSchema,
)
from backend.api_v1.employee_mission.mission_audit import MissionAudit
from backend.api_v1.employee_mission_comment.employee_mission_comment_messages import (
    EmployeeMissionCommentCreateSuccess,
    EmployeeMissionCommentDeleteSuccess,
    EmployeeMissionCommentNotFound,
    EmployeeMissionCommentUpdateSuccess,
)
from backend.api_v1.employee_mission_comment.employee_mission_comment_repository import (
    EmployeeMissionCommentRepository,
)
from backend.api_v1.employee_mission_comment.employee_mission_comment_schema import (
    EmployeeMissionCommentCreate,
    EmployeeMissionCommentUpdate,
)
from backend.utils.enums import OperationVerb


class EmployeeMissionCommentService(BaseService):
    """
    Comments on a mission — the EMPLOYEE's write surface.

    Note the different gate from every other mission service: `assert_can_author`
    (the subject employee, or admin/dev), not `assert_can_manage` (the oversight
    manager). An employee cannot edit their plan but can talk about it; an
    oversight manager holds the opposite rights and comments only through the
    review notes their role already provides.
    """

    def __init__(
        self,
        repository: EmployeeMissionCommentRepository,
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

    async def _get_comment_or_404(self, comment_id: int):
        record = await self.repository.get_by_id(comment_id)
        if not record:
            raise await self._resolve_domain_error(
                EmployeeMissionCommentNotFound(comment_id)
            )
        return record

    async def _to_schema(self, records: List) -> List[EmployeeMissionCommentSchema]:
        minis = await fetch_employee_minis(
            self.session, [r.author_employee_id for r in records]
        )
        out = []
        for record in records:
            schema = EmployeeMissionCommentSchema.model_validate(record)
            mini = minis.get(record.author_employee_id)
            schema.author_name = mini["name"] if mini else None
            out.append(schema)
        return out

    async def get_for_mission(
        self, mission_id: int
    ) -> List[EmployeeMissionCommentSchema]:
        """Scoped read: this route is keyed by mission_id, so there is no
        {employee_id} for PeopleReviewScopedGuard to check — resolve the owner
        first and apply the same audience here. Comments are free text about a
        person, so an unguarded read would be the worst leak in the feature."""
        employee_id = await self._mission_employee_id(mission_id)
        await self.access.assert_can_read(employee_id)
        records = await self.repository.get_for_mission(mission_id)
        return await self._to_schema(list(records))

    async def create_comment(
        self, mission_id: int, payload: EmployeeMissionCommentCreate
    ) -> MutationResponse[EmployeeMissionCommentSchema]:
        employee_id = await self._mission_employee_id(mission_id)
        await self.access.assert_can_author(employee_id, OperationVerb.CREATE)

        comment = self.repository.model(
            mission_id=mission_id,
            author_employee_id=self.user.id,
            text=payload.text,
        )
        self.session.add(comment)
        await self.session.flush()

        await self.audit.log_comment(
            comment_id=comment.id,
            employee_id=employee_id,
            action=ChangeAction.CREATE,
            changes={"text": {"old": None, "new": comment.text}},
        )
        await self.session.commit()

        schema = (await self._to_schema([comment]))[0]
        detail = await self._resolve_domain_success(
            EmployeeMissionCommentCreateSuccess()
        )
        return MutationResponse(detail=detail, data=schema)

    async def update_comment(
        self, comment_id: int, payload: EmployeeMissionCommentUpdate
    ) -> MutationResponse[EmployeeMissionCommentSchema]:
        record = await self._get_comment_or_404(comment_id)
        await self.access.assert_owns_comment(record.author_employee_id)
        employee_id = await self._mission_employee_id(record.mission_id)

        old_text = record.text
        record.text = payload.text
        if old_text != record.text:
            await self.audit.log_comment(
                comment_id=record.id,
                employee_id=employee_id,
                action=ChangeAction.UPDATE,
                changes={"text": {"old": old_text, "new": record.text}},
            )
        await self.session.commit()

        schema = (await self._to_schema([record]))[0]
        detail = await self._resolve_domain_success(
            EmployeeMissionCommentUpdateSuccess()
        )
        return MutationResponse(detail=detail, data=schema)

    async def delete_comment(self, comment_id: int) -> str:
        record = await self._get_comment_or_404(comment_id)
        await self.access.assert_owns_comment(record.author_employee_id)
        employee_id = await self._mission_employee_id(record.mission_id)

        await self.audit.log_comment(
            comment_id=record.id,
            employee_id=employee_id,
            action=ChangeAction.DELETE,
            changes={"text": {"old": record.text, "new": None}},
        )
        await self.session.delete(record)
        await self.session.commit()
        return await self._resolve_domain_success(EmployeeMissionCommentDeleteSuccess())

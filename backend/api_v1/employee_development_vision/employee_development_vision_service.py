
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.audit.change_log.change_log_schema import ChangeAction
from backend.api_v1.base.base_service import BaseService
from backend.api_v1.base.mutation_response import MutationResponse
from backend.api_v1.employee.employee_schema import EmployeeSchema
from backend.api_v1.employee_development_vision.employee_development_vision_messages import (
    DevelopmentVisionSaveSuccess,
)
from backend.api_v1.employee_development_vision.employee_development_vision_repository import (
    EmployeeDevelopmentVisionRepository,
)
from backend.api_v1.employee_development_vision.employee_development_vision_schema import (
    EmployeeDevelopmentVisionSchema,
)
from backend.api_v1.employee_mission.employee_mission_access import (
    EmployeeMissionAccess,
)
from backend.api_v1.employee_mission.mission_audit import MissionAudit
from backend.utils.enums import OperationVerb


class EmployeeDevelopmentVisionService(BaseService):
    """
    The employee's own statement of where they want to develop.

    Employee-level counterpart of the per-review `employee_feedback` field, and
    the second half (with mission comments) of the employee's write surface now
    that missions themselves are oversight-managed.
    """

    def __init__(
        self,
        repository: EmployeeDevelopmentVisionRepository,
        user: EmployeeSchema | None = None,
        session: AsyncSession | None = None,
    ) -> None:
        super().__init__(repository, user=user, session=session)
        self.access = EmployeeMissionAccess(user=user, session=session)
        self.audit = MissionAudit(user=user, session=session)

    async def get_for_employee(
        self, employee_id: int
    ) -> EmployeeDevelopmentVisionSchema | None:
        """None when the employee has not written one yet — the UI shows an empty
        card rather than a 404."""
        record = await self.repository.get_for_employee(employee_id)
        return (
            EmployeeDevelopmentVisionSchema.model_validate(record) if record else None
        )

    async def set_for_employee(
        self, employee_id: int, text: str
    ) -> MutationResponse[EmployeeDevelopmentVisionSchema]:
        await self.access.assert_can_author(employee_id, OperationVerb.MODIFY)

        previous = await self.repository.get_for_employee(employee_id)
        old_text = previous.text if previous else None
        record = await self.repository.upsert_for_employee(employee_id, text)

        if old_text != text:
            await self.audit.log_vision(
                vision_id=record.id,
                employee_id=employee_id,
                action=(
                    ChangeAction.CREATE if previous is None else ChangeAction.UPDATE
                ),
                changes={"text": {"old": old_text, "new": text}},
            )
        await self.session.commit()

        # `updated_at` is server-generated via onupdate=func.now(). On an UPDATE
        # SQLAlchemy cannot know the new value, so it leaves the attribute
        # EXPIRED — and because the session is expire_on_commit=False, nothing
        # reloads it. Serializing would then touch an expired attribute and
        # trigger a lazy load outside the async greenlet (MissingGreenlet -> 500).
        # An explicit awaited refresh is the only safe way to read it back.
        # (Inserts happen to survive this because Postgres returns server
        # defaults via RETURNING — which is why only the UPDATE path failed.)
        await self.session.refresh(record)

        schema = EmployeeDevelopmentVisionSchema.model_validate(record)
        detail = await self._resolve_domain_success(DevelopmentVisionSaveSuccess())
        return MutationResponse(detail=detail, data=schema)

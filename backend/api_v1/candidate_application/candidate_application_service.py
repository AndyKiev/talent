from typing import Optional, List

from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.base.base_service import BaseService
from backend.api_v1.base.mutation_response import MutationResponse
from backend.api_v1.employee.employee_schema import EmployeeSchema
from backend.api_v1.candidate_application.candidate_application_repository import (
    CandidateApplicationRepository,
)
from backend.api_v1.candidate_application.candidate_application_model import (
    CandidateApplication,
)
from backend.api_v1.application_status_history.application_status_history_model import (
    ApplicationStatusHistory,
)
from backend.api_v1.pipeline_status.pipeline_status_repository import (
    PipelineStatusRepository,
)
from backend.api_v1.candidate_application.candidate_application_schema import (
    CandidateApplicationSchema,
    CandidateApplicationCreate,
)
from backend.api_v1.candidate_application.candidate_application_state_machine import (
    PipelineStatusKey,
    can_transition,
)
from backend.api_v1.candidate_application.candidate_application_messages import (
    CandidateApplicationNotFound,
    CandidateApplicationAlreadyExists,
    CandidateApplicationInvalidTransition,
    CandidateApplicationDeleteError,
    CandidateApplicationDeleteSuccess,
    CandidateApplicationCreateSuccess,
    CandidateApplicationStatusChangeSuccess,
)


class CandidateApplicationService(BaseService):
    def __init__(
        self,
        repository: CandidateApplicationRepository,
        user: Optional[EmployeeSchema] = None,
        session: Optional[AsyncSession] = None,
    ):
        super().__init__(repository, user=user, session=session)
        self.status_repository = PipelineStatusRepository(session=session)

    async def get_by_id(self, id: int) -> CandidateApplication:
        result = await self.repository.get_by_id(id)
        if not result:
            raise await self._resolve_domain_error(CandidateApplicationNotFound(id))
        return result

    async def _status_by_name(self, name: str):
        return await self.status_repository.get_by_field("name", name)

    async def get_candidate_applications(
        self,
        candidate_id: Optional[int] = None,
        recruitment_task_id: Optional[int] = None,
    ) -> List[CandidateApplicationSchema]:
        filters = {}
        if candidate_id is not None:
            filters["candidate_id"] = candidate_id
        if recruitment_task_id is not None:
            filters["recruitment_task_id"] = recruitment_task_id
        records = await self.get_all(params=filters or None, sort=["created_at", "id"])
        return [CandidateApplicationSchema.model_validate(r) for r in records]

    async def create_candidate_application(
        self, app_in: CandidateApplicationCreate
    ) -> MutationResponse[CandidateApplicationSchema]:
        existing = await self.get_all(
            params={
                "candidate_id": app_in.candidate_id,
                "recruitment_task_id": app_in.recruitment_task_id,
            }
        )
        if existing:
            raise await self._resolve_domain_error(
                CandidateApplicationAlreadyExists(
                    app_in.candidate_id, app_in.recruitment_task_id
                )
            )
        applied = await self._status_by_name(PipelineStatusKey.APPLIED.value)
        record = CandidateApplication(
            candidate_id=app_in.candidate_id,
            recruitment_task_id=app_in.recruitment_task_id,
            status_id=applied.id,
            created_by=self.user.id,
        )
        # Seed the timeline with the initial "applied" step.
        record.status_history = [
            ApplicationStatusHistory(status_id=applied.id, changed_by=self.user.id)
        ]
        try:
            record = await self.repository.create(instance=record)
        except IntegrityError:
            raise await self._resolve_domain_error(
                CandidateApplicationAlreadyExists(
                    app_in.candidate_id, app_in.recruitment_task_id
                )
            )
        record = await self.get_by_id(record.id)
        schema = CandidateApplicationSchema.model_validate(record)
        detail = await self._resolve_domain_success(
            CandidateApplicationCreateSuccess()
        )
        return MutationResponse(detail=detail, data=schema)

    async def change_status(
        self, application_id: int, target_key: PipelineStatusKey
    ) -> MutationResponse[CandidateApplicationSchema]:
        orm_record = await self.get_by_id(application_id)
        current_key = PipelineStatusKey(orm_record.status.name)
        if not can_transition(current_key, target_key):
            raise await self._resolve_domain_error(
                CandidateApplicationInvalidTransition(
                    current_key.value, target_key.value
                )
            )
        # NOTE (Phase B): moving to `interview` will require/auto-open an
        # interview record here — same shape as the recruitment_task in_process
        # gate. In Phase A the transition is open.
        target_status = await self._status_by_name(target_key.value)
        # Assign the relationship (not just the FK) so the returned schema's
        # nested status is correct across commit (expire_on_commit=False).
        orm_record.status = target_status
        orm_record.status_history.append(
            ApplicationStatusHistory(
                status_id=target_status.id, changed_by=self.user.id
            )
        )
        await self.session.commit()
        refreshed = await self.get_by_id(application_id)
        schema = CandidateApplicationSchema.model_validate(refreshed)
        detail = await self._resolve_domain_success(
            CandidateApplicationStatusChangeSuccess(target_key.value)
        )
        return MutationResponse(detail=detail, data=schema)

    async def delete_candidate_application(self, application_id: int) -> None:
        await self.get_by_id(application_id)
        await self.delete_by_id(
            application_id,
            name=str(application_id),
            delete_error_exc=CandidateApplicationDeleteError,
            delete_success_exc=CandidateApplicationDeleteSuccess,
        )

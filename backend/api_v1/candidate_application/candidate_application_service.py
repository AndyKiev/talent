from typing import Optional, List

from sqlalchemy import select, func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.recruitment_task.recruitment_task_model import RecruitmentTask
from backend.api_v1.pipeline_status.pipeline_status_model import PipelineStatus

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
from backend.api_v1.candidate.candidate_model import Candidate
from backend.api_v1.job.job_model import Job
from backend.api_v1.employee.employee_minis import fetch_employee_minis
from backend.api_v1.candidate_application.candidate_application_schema import (
    CandidateApplicationSchema,
    CandidateApplicationCreate,
    ApplicationCandidateMini,
    ApplicationTaskMini,
    ApplicationJobMini,
    ApplicationCreatorMini,
)
from backend.api_v1.candidate_application.candidate_application_state_machine import (
    PipelineStatusKey,
    can_transition,
)
from backend.api_v1.candidate_application.candidate_application_messages import (
    CandidateApplicationNotFound,
    CandidateApplicationAlreadyExists,
    CandidateApplicationInvalidTransition,
    CandidateApplicationNoOpenings,
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

    async def _enrich_many(
        self, schemas: List[CandidateApplicationSchema]
    ) -> List[CandidateApplicationSchema]:
        """Fill candidate / task / changer minis via batched COLUMN queries —
        the model relationships are lazy="noload" to avoid heavy graph loads."""
        if not schemas:
            return schemas
        session = self.repository.session
        cand_ids = {s.candidate_id for s in schemas}
        cand_rows = (
            await session.execute(
                select(
                    Candidate.id,
                    Candidate.first_name,
                    Candidate.last_name,
                    Candidate.email,
                ).where(Candidate.id.in_(cand_ids))
            )
        ).all()
        cand_minis = {
            r[0]: ApplicationCandidateMini(
                id=r[0], first_name=r[1], last_name=r[2], email=r[3]
            )
            for r in cand_rows
        }
        task_ids = {s.recruitment_task_id for s in schemas}
        task_rows = (
            await session.execute(
                select(RecruitmentTask.id, RecruitmentTask.job_id, Job.name)
                .join(Job, Job.id == RecruitmentTask.job_id)
                .where(RecruitmentTask.id.in_(task_ids))
            )
        ).all()
        task_minis = {
            r[0]: ApplicationTaskMini(
                id=r[0], job_id=r[1], job=ApplicationJobMini(id=r[1], name=r[2])
            )
            for r in task_rows
        }
        emp_minis = await fetch_employee_minis(
            session, (h.changed_by for s in schemas for h in s.status_history)
        )
        for s in schemas:
            s.candidate = cand_minis.get(s.candidate_id)
            s.recruitment_task = task_minis.get(s.recruitment_task_id)
            for h in s.status_history:
                mini = emp_minis.get(h.changed_by)
                if mini:
                    h.changer = ApplicationCreatorMini(**mini)
        return schemas

    async def _enrich(
        self, schema: CandidateApplicationSchema
    ) -> CandidateApplicationSchema:
        await self._enrich_many([schema])
        return schema

    async def get_application_detail(
        self, application_id: int
    ) -> CandidateApplicationSchema:
        record = await self.get_by_id(application_id)
        return await self._enrich(CandidateApplicationSchema.model_validate(record))

    async def _task_openings(self, task_id: int) -> int:
        stmt = select(RecruitmentTask.openings).where(RecruitmentTask.id == task_id)
        return (await self.repository.session.execute(stmt)).scalar_one()

    async def _filled_count(self, task_id: int) -> int:
        """Applications for this task currently in offer + hired."""
        stmt = (
            select(func.count())
            .select_from(CandidateApplication)
            .join(PipelineStatus, PipelineStatus.id == CandidateApplication.status_id)
            .where(
                CandidateApplication.recruitment_task_id == task_id,
                PipelineStatus.name.in_(("offer", "hired")),
            )
        )
        return (await self.repository.session.execute(stmt)).scalar_one()

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
        return await self._enrich_many(
            [CandidateApplicationSchema.model_validate(r) for r in records]
        )

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
        schema = await self._enrich(CandidateApplicationSchema.model_validate(record))
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
        # Vacancy capacity: offer + hired together may not exceed the task's
        # openings. Only enforce when ENTERING that set (offer→hired keeps the
        # same seat, so it stays allowed).
        entering_filled = target_key in (
            PipelineStatusKey.OFFER,
            PipelineStatusKey.HIRED,
        ) and current_key not in (PipelineStatusKey.OFFER, PipelineStatusKey.HIRED)
        if entering_filled:
            openings = await self._task_openings(orm_record.recruitment_task_id)
            if await self._filled_count(orm_record.recruitment_task_id) >= openings:
                raise await self._resolve_domain_error(
                    CandidateApplicationNoOpenings(openings)
                )
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
        schema = await self._enrich(
            CandidateApplicationSchema.model_validate(refreshed)
        )
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

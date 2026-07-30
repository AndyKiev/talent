from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.recruitment_application_status_change.recruitment_application_status_change_model import (
    RecruitmentApplicationStatusChange,
)
from backend.api_v1.base.base_service import BaseService
from backend.api_v1.base.mutation_response import MutationResponse
from backend.api_v1.recruitment_candidate.recruitment_candidate_model import (
    RecruitmentCandidate,
)
from backend.api_v1.recruitment_application.recruitment_application_messages import (
    RecruitmentApplicationAlreadyExists,
    RecruitmentApplicationCreateSuccess,
    RecruitmentApplicationDeleteError,
    RecruitmentApplicationDeleteSuccess,
    RecruitmentApplicationInterviewRequired,
    RecruitmentApplicationInvalidTransition,
    RecruitmentApplicationNoOpenings,
    RecruitmentApplicationNotFound,
    RecruitmentApplicationStatusChangeSuccess,
)
from backend.api_v1.recruitment_application.recruitment_application_model import (
    RecruitmentApplication,
)
from backend.api_v1.recruitment_application.recruitment_application_repository import (
    RecruitmentApplicationRepository,
)
from backend.api_v1.recruitment_application.recruitment_application_schema import (
    ApplicationCandidateMini,
    ApplicationCreatorMini,
    ApplicationJobMini,
    ApplicationTaskMini,
    RecruitmentApplicationCreate,
    RecruitmentApplicationSchema,
)
from backend.api_v1.recruitment_application.recruitment_application_state_machine import (
    RecruitmentApplicationStatusKey,
    can_transition,
)
from backend.api_v1.employee.employee_minis import fetch_employee_minis
from backend.api_v1.employee.employee_schema import EmployeeSchema
from backend.api_v1.job.job_model import Job
from backend.api_v1.recruitment_application_status.recruitment_application_status_model import (
    RecruitmentApplicationStatus,
)
from backend.api_v1.recruitment_application_status.recruitment_application_status_repository import (
    RecruitmentApplicationStatusRepository,
)
from backend.api_v1.recruitment_task.recruitment_task_model import RecruitmentTask


class RecruitmentApplicationService(BaseService):
    def __init__(
        self,
        repository: RecruitmentApplicationRepository,
        user: EmployeeSchema | None = None,
        session: AsyncSession | None = None,
    ):
        super().__init__(repository, user=user, session=session)
        self.status_repository = RecruitmentApplicationStatusRepository(session=session)

    async def get_by_id(self, id: int) -> RecruitmentApplication:
        result = await self.repository.get_by_id(id)
        if not result:
            raise await self._resolve_domain_error(RecruitmentApplicationNotFound(id))
        return result

    async def _status_by_name(self, name: str):
        return await self.status_repository.get_by_field("name", name)

    async def _enrich_many(
        self, schemas: list[RecruitmentApplicationSchema]
    ) -> list[RecruitmentApplicationSchema]:
        """Fill candidate / task / creator minis via batched COLUMN queries —
        the model relationships are lazy="noload" to avoid heavy graph loads."""
        if not schemas:
            return schemas
        session = self.repository.session
        cand_ids = {s.candidate_id for s in schemas}
        cand_rows = (
            await session.execute(
                select(
                    RecruitmentCandidate.id,
                    RecruitmentCandidate.first_name,
                    RecruitmentCandidate.last_name,
                    RecruitmentCandidate.email,
                ).where(RecruitmentCandidate.id.in_(cand_ids))
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
            session, (h.created_by for s in schemas for h in s.status_history)
        )
        for s in schemas:
            s.candidate = cand_minis.get(s.candidate_id)
            s.recruitment_task = task_minis.get(s.recruitment_task_id)
            for h in s.status_history:
                mini = emp_minis.get(h.created_by)
                if mini:
                    h.creator = ApplicationCreatorMini(**mini)
        return schemas

    async def _enrich(
        self, schema: RecruitmentApplicationSchema
    ) -> RecruitmentApplicationSchema:
        await self._enrich_many([schema])
        return schema

    async def get_application_detail(
        self, application_id: int
    ) -> RecruitmentApplicationSchema:
        record = await self.get_by_id(application_id)
        return await self._enrich(RecruitmentApplicationSchema.model_validate(record))

    async def _has_interview(self, application_id: int) -> bool:
        # Local import keeps the module import graph acyclic (interview_service
        # imports THIS module).
        from backend.api_v1.recruitment_interview.recruitment_interview_model import (
            RecruitmentInterview,
        )

        stmt = (
            select(func.count())
            .select_from(RecruitmentInterview)
            .where(RecruitmentInterview.application_id == application_id)
        )
        return (await self.repository.session.execute(stmt)).scalar_one() > 0

    async def _task_openings(self, task_id: int) -> int:
        stmt = select(RecruitmentTask.openings).where(RecruitmentTask.id == task_id)
        return (await self.repository.session.execute(stmt)).scalar_one()

    async def _filled_count(self, task_id: int) -> int:
        """Applications for this task currently in offer + hired."""
        stmt = (
            select(func.count())
            .select_from(RecruitmentApplication)
            .join(
                RecruitmentApplicationStatus,
                RecruitmentApplicationStatus.id == RecruitmentApplication.status_id,
            )
            .where(
                RecruitmentApplication.recruitment_task_id == task_id,
                RecruitmentApplicationStatus.name.in_(("offer", "hired")),
            )
        )
        return (await self.repository.session.execute(stmt)).scalar_one()

    async def get_recruitment_applications(
        self,
        candidate_id: int | None = None,
        recruitment_task_id: int | None = None,
    ) -> list[RecruitmentApplicationSchema]:
        filters = {}
        if candidate_id is not None:
            filters["candidate_id"] = candidate_id
        if recruitment_task_id is not None:
            filters["recruitment_task_id"] = recruitment_task_id
        records = await self.get_all(params=filters or None, sort=["created_at", "id"])
        return await self._enrich_many(
            [RecruitmentApplicationSchema.model_validate(r) for r in records]
        )

    async def create_candidate_application(
        self, app_in: RecruitmentApplicationCreate
    ) -> MutationResponse[RecruitmentApplicationSchema]:
        existing = await self.get_all(
            params={
                "candidate_id": app_in.candidate_id,
                "recruitment_task_id": app_in.recruitment_task_id,
            }
        )
        if existing:
            raise await self._resolve_domain_error(
                RecruitmentApplicationAlreadyExists(
                    app_in.candidate_id, app_in.recruitment_task_id
                )
            )
        applied = await self._status_by_name(
            RecruitmentApplicationStatusKey.APPLIED.value
        )
        record = RecruitmentApplication(
            candidate_id=app_in.candidate_id,
            recruitment_task_id=app_in.recruitment_task_id,
            status_id=applied.id,
            created_by=self.user.id,
        )
        # Seed the timeline with the initial "applied" step.
        record.status_history = [
            RecruitmentApplicationStatusChange(
                status_id=applied.id, created_by=self.user.id
            )
        ]
        try:
            record = await self.repository.create(instance=record)
        except IntegrityError:
            raise await self._resolve_domain_error(
                RecruitmentApplicationAlreadyExists(
                    app_in.candidate_id, app_in.recruitment_task_id
                )
            )
        record = await self.get_by_id(record.id)
        schema = await self._enrich(RecruitmentApplicationSchema.model_validate(record))
        detail = await self._resolve_domain_success(
            RecruitmentApplicationCreateSuccess()
        )
        return MutationResponse(detail=detail, data=schema)

    def _can_override_transitions(self) -> bool:
        """admin / HRS (and the bypass dev group) may move a candidate BACKWARD
        along the pipeline without limits — the frontend warns about the
        consequences first. Everyone else is held to the state machine."""
        groups = {g.lower() for g in (getattr(self.user, "groups", None) or [])}
        return bool(groups & {"admin", "hrs", "dev"})

    async def change_status(
        self, application_id: int, target_key: RecruitmentApplicationStatusKey
    ) -> MutationResponse[RecruitmentApplicationSchema]:
        orm_record = await self.get_by_id(application_id)
        current_key = RecruitmentApplicationStatusKey(orm_record.status.name)
        if target_key == current_key:
            raise await self._resolve_domain_error(
                RecruitmentApplicationInvalidTransition(
                    current_key.value, target_key.value
                )
            )
        if not can_transition(current_key, target_key):
            # Backward/unusual move — only the privileged groups may do it.
            # The interview/capacity gates below still apply even then.
            if not self._can_override_transitions():
                raise await self._resolve_domain_error(
                    RecruitmentApplicationInvalidTransition(
                        current_key.value, target_key.value
                    )
                )
        # Interview gate: a card may only sit in `interview` once an interview
        # is actually scheduled for it (creating one auto-advances the card, so
        # this refusal only hits direct drags without a scheduled interview).
        if target_key == RecruitmentApplicationStatusKey.INTERVIEW and not (
            await self._has_interview(application_id)
        ):
            raise await self._resolve_domain_error(
                RecruitmentApplicationInterviewRequired()
            )
        # Vacancy capacity: offer + hired together may not exceed the task's
        # openings. Only enforce when ENTERING that set (offer→hired keeps the
        # same seat, so it stays allowed).
        entering_filled = target_key in (
            RecruitmentApplicationStatusKey.OFFER,
            RecruitmentApplicationStatusKey.HIRED,
        ) and current_key not in (
            RecruitmentApplicationStatusKey.OFFER,
            RecruitmentApplicationStatusKey.HIRED,
        )
        if entering_filled:
            openings = await self._task_openings(orm_record.recruitment_task_id)
            if await self._filled_count(orm_record.recruitment_task_id) >= openings:
                raise await self._resolve_domain_error(
                    RecruitmentApplicationNoOpenings(openings)
                )
        target_status = await self._status_by_name(target_key.value)
        # Assign the relationship (not just the FK) so the returned schema's
        # nested status is correct across commit (expire_on_commit=False).
        orm_record.status = target_status
        orm_record.status_history.append(
            RecruitmentApplicationStatusChange(
                status_id=target_status.id, created_by=self.user.id
            )
        )
        await self.session.commit()
        refreshed = await self.get_by_id(application_id)
        schema = await self._enrich(
            RecruitmentApplicationSchema.model_validate(refreshed)
        )
        detail = await self._resolve_domain_success(
            RecruitmentApplicationStatusChangeSuccess(target_key.value)
        )
        return MutationResponse(detail=detail, data=schema)

    async def delete_candidate_application(self, application_id: int) -> None:
        await self.get_by_id(application_id)
        await self.delete_by_id(
            application_id,
            name=str(application_id),
            delete_error_exc=RecruitmentApplicationDeleteError,
            delete_success_exc=RecruitmentApplicationDeleteSuccess,
        )

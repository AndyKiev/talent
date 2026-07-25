
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.app_setting.app_setting_service import get_int_setting
from backend.api_v1.base.base_service import BaseService
from backend.api_v1.base.mutation_response import MutationResponse
from backend.api_v1.candidate.candidate_model import Candidate
from backend.api_v1.candidate_application.candidate_application_messages import (
    CandidateApplicationNotFound,
)
from backend.api_v1.candidate_application.candidate_application_model import (
    CandidateApplication,
)
from backend.api_v1.candidate_application.candidate_application_repository import (
    CandidateApplicationRepository,
)
from backend.api_v1.candidate_application.candidate_application_service import (
    CandidateApplicationService,
)
from backend.api_v1.candidate_application.candidate_application_state_machine import (
    PipelineStatusKey,
    can_transition,
)
from backend.api_v1.employee.employee_minis import fetch_employee_minis
from backend.api_v1.employee.employee_model import Employee
from backend.api_v1.employee.employee_schema import EmployeeSchema
from backend.api_v1.interview.interview_messages import (
    InterviewCreateSuccess,
    InterviewDeleteError,
    InterviewDeleteSuccess,
    InterviewerGroupMissing,
    InterviewInterviewerNotManager,
    InterviewNotFound,
    InterviewTooManyInterviewers,
    InterviewUpdateSuccess,
)
from backend.api_v1.interview.interview_model import Interview
from backend.api_v1.interview.interview_repository import InterviewRepository
from backend.api_v1.interview.interview_schema import (
    InterviewCandidateMini,
    InterviewCreate,
    InterviewEmployeeMini,
    InterviewJobMini,
    InterviewSchema,
    InterviewUpdate,
)
from backend.api_v1.interview_interviewer.interview_interviewer_model import (
    InterviewInterviewer,
)
from backend.api_v1.job.job_model import Job
from backend.api_v1.job_category.job_category_model import JobCategory
from backend.api_v1.job_job_category_link.job_job_category_link_model import (
    JobJobCategoryLink,
)
from backend.api_v1.recruitment_task.recruitment_task_model import RecruitmentTask
from backend.api_v1.table_relationship_links.employee_user_group_link_model import (
    EmployeeUserGroupLink,
)
from backend.api_v1.user_group.user_group_model import UserGroup


class InterviewService(BaseService):
    def __init__(
        self,
        repository: InterviewRepository,
        user: EmployeeSchema | None = None,
        session: AsyncSession | None = None,
    ):
        super().__init__(repository, user=user, session=session)
        self.application_repository = CandidateApplicationRepository(session=session)

    async def get_by_id(self, id: int) -> Interview:
        result = await self.repository.get_by_id(id)
        if not result:
            raise await self._resolve_domain_error(InterviewNotFound(id))
        return result

    # ── Validation / side-effects ─────────────────────────────────────────────

    async def _validate_managers(self, employee_ids: list[int]) -> None:
        """Every interviewer must hold a job linked to the `manager` category, and
        the count may not exceed the `interview_max_interviewers` setting."""
        session = self.repository.session
        max_interviewers = await get_int_setting(
            session, "interview_max_interviewers", 3
        )
        if len(employee_ids) > max_interviewers:
            raise await self._resolve_domain_error(
                InterviewTooManyInterviewers(max_interviewers)
            )
        rows = (
            await session.execute(
                select(Employee.id)
                .join(
                    JobJobCategoryLink,
                    JobJobCategoryLink.job_id == Employee.job_id,
                )
                .join(
                    JobCategory,
                    JobCategory.id == JobJobCategoryLink.job_category_id,
                )
                .where(Employee.id.in_(employee_ids), JobCategory.key == "manager")
            )
        ).scalars()
        managers = set(rows)
        missing = [i for i in employee_ids if i not in managers]
        if missing:
            minis = await fetch_employee_minis(session, missing)
            names = ", ".join(
                minis.get(i, {"name": str(i)})["name"] for i in missing
            )
            raise await self._resolve_domain_error(
                InterviewInterviewerNotManager(names)
            )

    async def _add_to_interviewer_group(self, employee_ids: list[int]) -> None:
        """Idempotently add the interviewers to the `Interviewer` access group."""
        session = self.repository.session
        group_id = (
            await session.execute(
                select(UserGroup.id).where(
                    func.lower(UserGroup.name) == "interviewer"
                )
            )
        ).scalars().first()
        if group_id is None:
            raise await self._resolve_domain_error(InterviewerGroupMissing())
        existing = set(
            (
                await session.execute(
                    select(EmployeeUserGroupLink.employee_id).where(
                        EmployeeUserGroupLink.user_group_id == group_id,
                        EmployeeUserGroupLink.employee_id.in_(employee_ids),
                    )
                )
            ).scalars()
        )
        for eid in set(employee_ids) - existing:
            session.add(
                EmployeeUserGroupLink(employee_id=eid, user_group_id=group_id)
            )
        await session.commit()

    # ── Enrichment (noload relationships → minis via column queries) ──────────

    async def _enrich_many(self, schemas: list[InterviewSchema]) -> list[InterviewSchema]:
        if not schemas:
            return schemas
        session = self.repository.session
        emp_ids = [i.employee_id for s in schemas for i in s.interviewers]
        emp_ids += [f.author_id for s in schemas for f in s.feedbacks]
        emp_minis = await fetch_employee_minis(session, emp_ids)

        app_ids = {s.application_id for s in schemas}
        app_rows = (
            await session.execute(
                select(
                    CandidateApplication.id,
                    CandidateApplication.candidate_id,
                    CandidateApplication.recruitment_task_id,
                ).where(CandidateApplication.id.in_(app_ids))
            )
        ).all()
        app_map = {r[0]: (r[1], r[2]) for r in app_rows}

        cand_ids = {v[0] for v in app_map.values()}
        cand_rows = (
            await session.execute(
                select(
                    Candidate.id, Candidate.first_name, Candidate.last_name
                ).where(Candidate.id.in_(cand_ids))
            )
        ).all() if cand_ids else []
        cand_minis = {
            r[0]: InterviewCandidateMini(id=r[0], first_name=r[1], last_name=r[2])
            for r in cand_rows
        }

        task_ids = {v[1] for v in app_map.values()}
        task_rows = (
            await session.execute(
                select(RecruitmentTask.id, Job.id, Job.name)
                .join(Job, Job.id == RecruitmentTask.job_id)
                .where(RecruitmentTask.id.in_(task_ids))
            )
        ).all() if task_ids else []
        job_by_task = {r[0]: InterviewJobMini(id=r[1], name=r[2]) for r in task_rows}

        for s in schemas:
            entry = app_map.get(s.application_id)
            if entry:
                cand_id, task_id = entry
                s.candidate = cand_minis.get(cand_id)
                s.recruitment_task_id = task_id
                s.job = job_by_task.get(task_id)
            for i in s.interviewers:
                mini = emp_minis.get(i.employee_id)
                if mini:
                    i.employee = InterviewEmployeeMini(**mini)
            for f in s.feedbacks:
                mini = emp_minis.get(f.author_id)
                if mini:
                    f.author = InterviewEmployeeMini(**mini)
        return schemas

    async def _enrich(self, schema: InterviewSchema) -> InterviewSchema:
        await self._enrich_many([schema])
        return schema

    # ── Queries ───────────────────────────────────────────────────────────────

    async def get_interviews(
        self,
        application_id: int | None = None,
        candidate_id: int | None = None,
        mine: bool = False,
    ) -> list[InterviewSchema]:
        session = self.repository.session
        stmt = select(Interview).order_by(Interview.scheduled_at.desc()).distinct()
        if application_id is not None:
            stmt = stmt.where(Interview.application_id == application_id)
        if candidate_id is not None:
            stmt = stmt.join(
                CandidateApplication,
                CandidateApplication.id == Interview.application_id,
            ).where(CandidateApplication.candidate_id == candidate_id)
        if mine and self.user is not None:
            stmt = stmt.join(
                InterviewInterviewer,
                InterviewInterviewer.interview_id == Interview.id,
            ).where(InterviewInterviewer.employee_id == self.user.id)
        records = (await session.scalars(stmt)).unique().all()
        return await self._enrich_many(
            [InterviewSchema.model_validate(r) for r in records]
        )

    async def get_interview_detail(self, interview_id: int) -> InterviewSchema:
        record = await self.get_by_id(interview_id)
        return await self._enrich(InterviewSchema.model_validate(record))

    async def get_available_interviewers(self) -> list[InterviewEmployeeMini]:
        """Active employees holding a manager-category job (for the FE picker)."""
        session = self.repository.session
        rows = (
            await session.execute(
                select(Employee.id, Employee.name, Employee.code)
                .join(
                    JobJobCategoryLink,
                    JobJobCategoryLink.job_id == Employee.job_id,
                )
                .join(
                    JobCategory,
                    JobCategory.id == JobJobCategoryLink.job_category_id,
                )
                .where(JobCategory.key == "manager", Employee.is_active.is_(True))
                .order_by(Employee.name)
            )
        ).all()
        return [
            InterviewEmployeeMini(id=r[0], name=r[1], code=r[2]) for r in rows
        ]

    # ── Mutations ─────────────────────────────────────────────────────────────

    def _application_service(self) -> CandidateApplicationService:
        return CandidateApplicationService(
            self.application_repository, user=self.user, session=self.session
        )

    async def create_interview(
        self, data: InterviewCreate
    ) -> MutationResponse[InterviewSchema]:
        app = await self.application_repository.get_by_id(data.application_id)
        if not app:
            raise await self._resolve_domain_error(
                CandidateApplicationNotFound(data.application_id)
            )
        interviewer_ids = list(dict.fromkeys(data.interviewer_ids))
        await self._validate_managers(interviewer_ids)
        record = Interview(
            application_id=data.application_id,
            scheduled_at=data.scheduled_at,
            location=data.location,
            created_by=self.user.id,
        )
        record.interviewers = [
            InterviewInterviewer(employee_id=eid) for eid in interviewer_ids
        ]
        record = await self.repository.create(instance=record)
        await self._add_to_interviewer_group(interviewer_ids)
        # Scheduling an interview advances the application to the `interview`
        # stage when that transition is legal (e.g. from applied/screen).
        current_key = PipelineStatusKey(app.status.name)
        if can_transition(current_key, PipelineStatusKey.INTERVIEW):
            await self._application_service().change_status(
                app.id, PipelineStatusKey.INTERVIEW
            )
        record = await self.get_by_id(record.id)
        schema = await self._enrich(InterviewSchema.model_validate(record))
        detail = await self._resolve_domain_success(InterviewCreateSuccess())
        return MutationResponse(detail=detail, data=schema)

    async def update_interview(
        self, interview_id: int, data: InterviewUpdate
    ) -> MutationResponse[InterviewSchema]:
        orm_record = await self.get_by_id(interview_id)
        if data.scheduled_at is not None:
            orm_record.scheduled_at = data.scheduled_at
        if data.location is not None:
            orm_record.location = data.location
        if data.interviewer_ids is not None:
            interviewer_ids = list(dict.fromkeys(data.interviewer_ids))
            await self._validate_managers(interviewer_ids)
            orm_record.interviewers.clear()  # delete-orphan removes old links
            for eid in interviewer_ids:
                orm_record.interviewers.append(
                    InterviewInterviewer(employee_id=eid)
                )
            await self._add_to_interviewer_group(interviewer_ids)
        await self.session.commit()
        self.session.expunge(orm_record)
        refreshed = await self.get_by_id(interview_id)
        schema = await self._enrich(InterviewSchema.model_validate(refreshed))
        detail = await self._resolve_domain_success(InterviewUpdateSuccess())
        return MutationResponse(detail=detail, data=schema)

    async def delete_interview(self, interview_id: int) -> None:
        await self.get_by_id(interview_id)
        await self.delete_by_id(
            interview_id,
            name=str(interview_id),
            delete_error_exc=InterviewDeleteError,
            delete_success_exc=InterviewDeleteSuccess,
        )

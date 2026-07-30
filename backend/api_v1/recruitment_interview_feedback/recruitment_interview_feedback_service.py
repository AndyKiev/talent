from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.base.base_service import BaseService
from backend.api_v1.base.mutation_response import MutationResponse
from backend.api_v1.recruitment_application.recruitment_application_model import (
    RecruitmentApplication,
)
from backend.api_v1.employee.employee_minis import fetch_employee_minis
from backend.api_v1.employee.employee_schema import EmployeeSchema
from backend.api_v1.recruitment_interview.recruitment_interview_messages import (
    RecruitmentInterviewFeedbackCreateSuccess,
    RecruitmentInterviewNotFound,
)
from backend.api_v1.recruitment_interview.recruitment_interview_model import (
    RecruitmentInterview,
)
from backend.api_v1.recruitment_interview.recruitment_interview_repository import (
    RecruitmentInterviewRepository,
)
from backend.api_v1.recruitment_interview.recruitment_interview_schema import (
    RecruitmentInterviewEmployeeMini,
    RecruitmentInterviewFeedbackCreate,
    RecruitmentInterviewFeedbackSchema,
)
from backend.api_v1.recruitment_interview_feedback.recruitment_interview_feedback_model import (
    RecruitmentInterviewFeedback,
)
from backend.api_v1.recruitment_interview_feedback.recruitment_interview_feedback_repository import (
    RecruitmentInterviewFeedbackRepository,
)


class RecruitmentInterviewFeedbackService(BaseService):
    def __init__(
        self,
        repository: RecruitmentInterviewFeedbackRepository,
        user: EmployeeSchema | None = None,
        session: AsyncSession | None = None,
    ):
        super().__init__(repository, user=user, session=session)
        self.recruitment_interview_repository = RecruitmentInterviewRepository(
            session=session
        )

    async def _enrich_many(
        self, schemas: list[RecruitmentInterviewFeedbackSchema]
    ) -> list[RecruitmentInterviewFeedbackSchema]:
        emp_minis = await fetch_employee_minis(
            self.repository.session, (s.created_by for s in schemas)
        )
        for s in schemas:
            mini = emp_minis.get(s.created_by)
            if mini:
                s.creator = RecruitmentInterviewEmployeeMini(**mini)
        return schemas

    async def get_feedbacks(
        self,
        interview_id: int | None = None,
        candidate_id: int | None = None,
    ) -> list[RecruitmentInterviewFeedbackSchema]:
        session = self.repository.session
        stmt = select(RecruitmentInterviewFeedback).order_by(
            RecruitmentInterviewFeedback.created_at.desc()
        )
        if interview_id is not None:
            stmt = stmt.where(RecruitmentInterviewFeedback.interview_id == interview_id)
        if candidate_id is not None:
            stmt = (
                stmt.join(
                    RecruitmentInterview,
                    RecruitmentInterview.id
                    == RecruitmentInterviewFeedback.interview_id,
                )
                .join(
                    RecruitmentApplication,
                    RecruitmentApplication.id == RecruitmentInterview.application_id,
                )
                .where(RecruitmentApplication.candidate_id == candidate_id)
            )
        records = (await session.scalars(stmt)).all()
        return await self._enrich_many(
            [RecruitmentInterviewFeedbackSchema.model_validate(r) for r in records]
        )

    async def create_feedback(
        self, feedback_in: RecruitmentInterviewFeedbackCreate
    ) -> MutationResponse[RecruitmentInterviewFeedbackSchema]:
        interview = await self.recruitment_interview_repository.get_by_id(
            feedback_in.interview_id
        )
        if not interview:
            raise await self._resolve_domain_error(
                RecruitmentInterviewNotFound(feedback_in.interview_id)
            )
        record = RecruitmentInterviewFeedback(
            interview_id=feedback_in.interview_id,
            body=feedback_in.body,
            recommendation=feedback_in.recommendation,
            created_by=self.user.id,
        )
        record = await self.repository.create(instance=record)
        schemas = await self._enrich_many(
            [RecruitmentInterviewFeedbackSchema.model_validate(record)]
        )
        detail = await self._resolve_domain_success(
            RecruitmentInterviewFeedbackCreateSuccess()
        )
        return MutationResponse(detail=detail, data=schemas[0])

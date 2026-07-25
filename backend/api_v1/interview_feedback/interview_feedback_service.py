
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.base.base_service import BaseService
from backend.api_v1.base.mutation_response import MutationResponse
from backend.api_v1.candidate_application.candidate_application_model import (
    CandidateApplication,
)
from backend.api_v1.employee.employee_minis import fetch_employee_minis
from backend.api_v1.employee.employee_schema import EmployeeSchema
from backend.api_v1.interview.interview_messages import (
    InterviewFeedbackCreateSuccess,
    InterviewNotFound,
)
from backend.api_v1.interview.interview_model import Interview
from backend.api_v1.interview.interview_repository import InterviewRepository
from backend.api_v1.interview.interview_schema import (
    InterviewEmployeeMini,
    InterviewFeedbackCreate,
    InterviewFeedbackSchema,
)
from backend.api_v1.interview_feedback.interview_feedback_model import InterviewFeedback
from backend.api_v1.interview_feedback.interview_feedback_repository import (
    InterviewFeedbackRepository,
)


class InterviewFeedbackService(BaseService):
    def __init__(
        self,
        repository: InterviewFeedbackRepository,
        user: EmployeeSchema | None = None,
        session: AsyncSession | None = None,
    ):
        super().__init__(repository, user=user, session=session)
        self.interview_repository = InterviewRepository(session=session)

    async def _enrich_many(
        self, schemas: list[InterviewFeedbackSchema]
    ) -> list[InterviewFeedbackSchema]:
        emp_minis = await fetch_employee_minis(
            self.repository.session, (s.author_id for s in schemas)
        )
        for s in schemas:
            mini = emp_minis.get(s.author_id)
            if mini:
                s.author = InterviewEmployeeMini(**mini)
        return schemas

    async def get_feedbacks(
        self,
        interview_id: int | None = None,
        candidate_id: int | None = None,
    ) -> list[InterviewFeedbackSchema]:
        session = self.repository.session
        stmt = select(InterviewFeedback).order_by(InterviewFeedback.created_at.desc())
        if interview_id is not None:
            stmt = stmt.where(InterviewFeedback.interview_id == interview_id)
        if candidate_id is not None:
            stmt = (
                stmt.join(Interview, Interview.id == InterviewFeedback.interview_id)
                .join(
                    CandidateApplication,
                    CandidateApplication.id == Interview.application_id,
                )
                .where(CandidateApplication.candidate_id == candidate_id)
            )
        records = (await session.scalars(stmt)).all()
        return await self._enrich_many(
            [InterviewFeedbackSchema.model_validate(r) for r in records]
        )

    async def create_feedback(
        self, feedback_in: InterviewFeedbackCreate
    ) -> MutationResponse[InterviewFeedbackSchema]:
        interview = await self.interview_repository.get_by_id(
            feedback_in.interview_id
        )
        if not interview:
            raise await self._resolve_domain_error(
                InterviewNotFound(feedback_in.interview_id)
            )
        record = InterviewFeedback(
            interview_id=feedback_in.interview_id,
            body=feedback_in.body,
            recommendation=feedback_in.recommendation,
            author_id=self.user.id,
        )
        record = await self.repository.create(instance=record)
        schemas = await self._enrich_many(
            [InterviewFeedbackSchema.model_validate(record)]
        )
        detail = await self._resolve_domain_success(InterviewFeedbackCreateSuccess())
        return MutationResponse(detail=detail, data=schemas[0])

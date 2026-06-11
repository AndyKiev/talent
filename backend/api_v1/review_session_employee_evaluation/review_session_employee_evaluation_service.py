from typing import Optional, List

from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.base.base_service import BaseService
from backend.api_v1.base.mutation_response import MutationResponse
from backend.api_v1.review_session_employee_evaluation.review_session_employee_evaluation_repository import (
    ReviewSessionEmployeeEvaluationRepository,
)
from backend.api_v1.review_session_employee_evaluation.review_session_employee_evaluation_schema import (
    Evaluation as EvaluationSchema,
    EvaluationUpdate,
    EvaluationBulkUpdate,
)
from backend.api_v1.employee.employee_schema import EmployeeSchema
from backend.api_v1.review_session_employee_evaluation.review_session_employee_evaluation_errors import (
    EvaluationNotFound,
    EvaluationNotEditable,
)
from backend.api_v1.review_session_employee_evaluation.review_session_employee_evaluation_success import (
    EvaluationSaveSuccess,
)
from backend.api_v1.review_session_employee_criterion_score.review_session_employee_criterion_score_model import (
    ReviewSessionEmployeeCriterionScore,
)


class ReviewSessionEmployeeEvaluationService(BaseService):
    def __init__(
        self,
        repository: ReviewSessionEmployeeEvaluationRepository,
        user: Optional[EmployeeSchema] = None,
        session: Optional[AsyncSession] = None,
    ):
        super().__init__(repository, user=user, session=session)

    async def get_by_id(self, id: int):
        result = await self.repository.get_by_id(id)
        if not result:
            exc = EvaluationNotFound(id)
            raise await self._resolve_domain_error(exc)
        return result

    def _to_schema(self, record) -> EvaluationSchema:
        schema = EvaluationSchema.model_validate(record)
        if record.dimension:
            schema.dimension_name = record.dimension.name
            schema.dimension_key = record.dimension.key
            schema.dimension_description = record.dimension.description
            schema.dimension_is_active = record.dimension.is_active
        return schema

    async def get_evaluations(
        self,
        review_session_employee_id: int,
    ) -> List[EvaluationSchema]:
        records = await self.get_all(
            params={"review_session_employee_id": review_session_employee_id}
        )
        return [self._to_schema(r) for r in records]

    async def update_evaluation(
        self, eval_id: int, eval_update: EvaluationUpdate
    ) -> MutationResponse[EvaluationSchema]:
        orm_record = await self.get_by_id(eval_id)

        rse = orm_record.review_session_employee
        if rse and rse.status != "open":
            raise await self._resolve_domain_error(EvaluationNotEditable())
        if rse and rse.session and rse.session.status != "open":
            raise await self._resolve_domain_error(EvaluationNotEditable())

        updated = await self.update(orm_record, eval_update, partial=True)
        schema = self._to_schema(updated)
        detail = await self._resolve_domain_success(EvaluationSaveSuccess())
        return MutationResponse(detail=detail, data=schema)

    async def bulk_update(
        self, updates: List[EvaluationBulkUpdate]
    ) -> MutationResponse[List[EvaluationSchema]]:
        results = []
        for upd in updates:
            orm_record = await self.get_by_id(upd.id)

            rse = orm_record.review_session_employee
            if rse and rse.status != "open":
                raise await self._resolve_domain_error(EvaluationNotEditable())
            if rse and rse.session and rse.session.status != "open":
                raise await self._resolve_domain_error(EvaluationNotEditable())

            sent = upd.model_dump(exclude_unset=True)
            if "facts" in sent:
                orm_record.facts = upd.facts
            if "improvement" in sent:
                orm_record.improvement = upd.improvement

            if upd.criterion_scores is not None:
                # Replace the descriptor scores wholesale, then recompute the
                # competence level (fractional mean + legacy rounded int).
                orm_record.criterion_scores.clear()
                await self.session.flush()  # emit the deletes before re-inserting
                values: list[int] = []
                for cs in upd.criterion_scores:
                    orm_record.criterion_scores.append(
                        ReviewSessionEmployeeCriterionScore(
                            criterion_index=cs.criterion_index,
                            score=cs.score,
                        )
                    )
                    values.append(cs.score)
                if values:
                    mean = sum(values) / len(values)
                    orm_record.mean_score = round(mean, 2)
                    orm_record.score = round(mean)
                else:
                    orm_record.mean_score = None
                    orm_record.score = None

            results.append(orm_record)

        await self.session.commit()
        for r in results:
            await self.session.refresh(r)

        schemas = [self._to_schema(r) for r in results]
        detail = await self._resolve_domain_success(EvaluationSaveSuccess())
        return MutationResponse(detail=detail, data=schemas)

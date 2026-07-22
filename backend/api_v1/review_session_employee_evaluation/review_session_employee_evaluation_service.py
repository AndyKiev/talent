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
    EvaluationFlipCompetence,
)
from backend.api_v1.employee.employee_schema import EmployeeSchema
from backend.api_v1.review_session_employee_evaluation.review_session_employee_evaluation_messages import (
    EvaluationNotFound,
    EvaluationNotEditable,
)
from backend.api_v1.review_session_employee_evaluation.review_session_employee_evaluation_messages import (
    EvaluationSaveSuccess,
)
from backend.api_v1.review_session_employee_criterion_score.review_session_employee_criterion_score_model import (
    ReviewSessionEmployeeCriterionScore,
)
from backend.api_v1.review_session_employee.review_session_employee_repository import (
    ReviewSessionEmployeeRepository,
)
from backend.api_v1.review_session_employee.review_session_employee_service import (
    ReviewSessionEmployeeService,
)
from backend.api_v1.review_session_employee.review_session_employee_model import (
    ReviewSessionEmployee,
)
from backend.api_v1.review_session_criterion.review_session_criterion_model import (
    ReviewSessionCriterion,
)
from backend.api_v1.review_session_criterion.review_session_criterion_schema import (
    FrozenCriterionSchema,
)
from backend.api_v1.review_session_employee_dimension_type.review_session_employee_dimension_type_model import (
    STRONG,
    ReviewSessionEmployeeDimensionType,
)
from backend.api_v1.review_session_employee_dimension_type.review_session_employee_dimension_type_messages import (
    ReviewSessionEmployeeDimensionTypeNotFound,
)
from backend.api_v1.review_session_employee_dimension.review_session_employee_dimension_model import (
    ReviewSessionEmployeeDimension,
)
from sqlalchemy import delete, select
from sqlalchemy.orm import raiseload


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
            schema.dimension_color = record.dimension.color
            schema.dimension_sort_order = record.dimension.sort_order
        return schema

    async def _assert_rse_visible(self, rse_id: int) -> None:
        """Delegate to the RSE service's people-review visibility guard so an
        out-of-scope employee's evaluations can't be fetched by a typed-in URL."""
        rse_service = ReviewSessionEmployeeService(
            repository=ReviewSessionEmployeeRepository(session=self.session),
            user=self.user,
            session=self.session,
        )
        await rse_service.assert_rse_visible(rse_id)

    async def get_evaluations(
        self,
        review_session_employee_id: int,
    ) -> List[EvaluationSchema]:
        await self._assert_rse_visible(review_session_employee_id)
        records = await self.repository.list_by_rse(review_session_employee_id)
        frozen_by_dim = await self._frozen_criteria_by_dimension(
            review_session_employee_id
        )
        schemas = []
        for r in records:
            schema = self._to_schema(r)
            schema.criteria = frozen_by_dim.get(r.dimension_id, [])
            schemas.append(schema)
        return schemas

    async def _frozen_criteria_by_dimension(
        self, review_session_employee_id: int
    ) -> dict[int, List[FrozenCriterionSchema]]:
        """The session's frozen criteria (this RSE's session), grouped by
        dimension and ordered for display. Empty when the session predates the
        freeze — the frontend then falls back to parsing the live hint."""
        session_id = await self.session.scalar(
            select(ReviewSessionEmployee.session_id).where(
                ReviewSessionEmployee.id == review_session_employee_id
            )
        )
        if session_id is None:
            return {}
        rows = (
            (
                await self.session.execute(
                    # raiseload("*"): frozen criteria only need columns (id/text/
                    # sort_order/dimension_id); the session/dimension selectin
                    # relationships otherwise cascade into the reviewed employees'
                    # whole graph (hundreds of queries) via ReviewSession.
                    select(ReviewSessionCriterion)
                    .options(raiseload("*"))
                    .where(ReviewSessionCriterion.session_id == session_id)
                    .order_by(
                        ReviewSessionCriterion.sort_order,
                        ReviewSessionCriterion.id,
                    )
                )
            )
            .scalars()
            .all()
        )
        grouped: dict[int, List[FrozenCriterionSchema]] = {}
        for row in rows:
            grouped.setdefault(row.dimension_id, []).append(
                FrozenCriterionSchema.model_validate(row)
            )
        return grouped

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

    async def flip_competence(
        self, eval_id: int, payload: EvaluationFlipCompetence
    ) -> MutationResponse[EvaluationSchema]:
        """Atomically re-rate a competence so it moves to the opposite summary
        list. In ONE transaction: set the single descriptor score (recomputing
        mean_score + legacy rounded score), clear the leaving side's dim column
        (facts for "strong", improvement for "develop"), and DELETE the
        competence's row on the leaving side of the summary (its comments cascade).
        Commits once; rolls back on any failure so the rows can never end up
        inconsistent."""
        orm_record = await self.get_by_id(eval_id)
        leaving_type = await self.session.get(
            ReviewSessionEmployeeDimensionType, payload.leaving_type_id
        )
        if leaving_type is None:
            raise await self._resolve_domain_error(
                ReviewSessionEmployeeDimensionTypeNotFound(payload.leaving_type_id)
            )

        rse = orm_record.review_session_employee
        if rse and rse.status != "open":
            raise await self._resolve_domain_error(EvaluationNotEditable())
        if rse and rse.session and rse.session.status != "open":
            raise await self._resolve_domain_error(EvaluationNotEditable())

        try:
            # 1) Set the one descriptor score (update in place or insert).
            existing = next(
                (
                    cs
                    for cs in orm_record.criterion_scores
                    if cs.criterion_index == payload.criterion_index
                ),
                None,
            )
            if existing is not None:
                existing.score = payload.new_score
            else:
                orm_record.criterion_scores.append(
                    ReviewSessionEmployeeCriterionScore(
                        criterion_index=payload.criterion_index,
                        score=payload.new_score,
                    )
                )

            # Recompute the competence level over the full descriptor set.
            values = [cs.score for cs in orm_record.criterion_scores]
            if values:
                mean = sum(values) / len(values)
                orm_record.mean_score = round(mean, 2)
                orm_record.score = round(mean)
            else:
                orm_record.mean_score = None
                orm_record.score = None

            # 2) Clear the leaving side's dimension column.
            if leaving_type.key == STRONG:
                orm_record.facts = None
            else:
                orm_record.improvement = None

            # 3) Drop the competence from the leaving side of the RSE summary.
            #    The comment rows go with it via ON DELETE CASCADE.
            if rse is not None:
                await self.session.execute(
                    delete(ReviewSessionEmployeeDimension).where(
                        ReviewSessionEmployeeDimension.review_session_employee_id
                        == rse.id,
                        ReviewSessionEmployeeDimension.review_session_employee_dimension_type_id
                        == leaving_type.id,
                        ReviewSessionEmployeeDimension.dimension_id
                        == orm_record.dimension_id,
                    )
                )

            await self.session.commit()
        except Exception:
            await self.session.rollback()
            raise

        await self.session.refresh(orm_record)
        schema = self._to_schema(orm_record)
        detail = await self._resolve_domain_success(EvaluationSaveSuccess())
        return MutationResponse(detail=detail, data=schema)

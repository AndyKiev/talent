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
from backend.api_v1.review_session_employee.review_session_employee_repository import (
    ReviewSessionEmployeeRepository,
)
from backend.api_v1.review_session_employee.review_session_employee_service import (
    ReviewSessionEmployeeService,
)

import json


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

    async def flip_competence(
        self, eval_id: int, payload: EvaluationFlipCompetence
    ) -> MutationResponse[EvaluationSchema]:
        """Atomically re-rate a competence so it moves to the opposite summary
        list. In ONE transaction: set the single descriptor score (recomputing
        mean_score + legacy rounded score), clear the leaving side's dim column
        (facts for "strong", improvement for "develop"), and strip the competence
        from the RSE's competence_summary JSON. Commits once; rolls back on any
        failure so the two rows can never end up inconsistent."""
        orm_record = await self.get_by_id(eval_id)

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
            if payload.leaving_side == "strong":
                orm_record.facts = None
            else:
                orm_record.improvement = None

            # 3) Strip the competence from the leaving side of the RSE summary.
            if rse is not None:
                dim_key = orm_record.dimension.key if orm_record.dimension else None
                rse.competence_summary = self._strip_summary_side(
                    rse.competence_summary, payload.leaving_side, dim_key
                )

            await self.session.commit()
        except Exception:
            await self.session.rollback()
            raise

        await self.session.refresh(orm_record)
        schema = self._to_schema(orm_record)
        detail = await self._resolve_domain_success(EvaluationSaveSuccess())
        return MutationResponse(detail=detail, data=schema)

    @staticmethod
    def _strip_summary_side(
        competence_summary: Optional[str], side: str, dimension_key: Optional[str]
    ) -> Optional[str]:
        """Return competence_summary JSON with `dimension_key` removed from the
        given side ("strong"/"develop"). Tolerant of missing/invalid JSON — an
        unparseable value is left untouched. Returns None when the result is
        empty (matching how the field is stored when no summary exists)."""
        if not competence_summary or not dimension_key:
            return competence_summary
        try:
            obj = json.loads(competence_summary)
        except (ValueError, TypeError):
            return competence_summary
        if not isinstance(obj, dict):
            return competence_summary

        bucket = obj.get(side)
        if isinstance(bucket, list):
            obj[side] = [
                item
                for item in bucket
                if not (
                    isinstance(item, dict)
                    and item.get("dimension_key") == dimension_key
                )
            ]

        strong = obj.get("strong") or []
        develop = obj.get("develop") or []
        if not strong and not develop:
            return None
        return json.dumps(obj)

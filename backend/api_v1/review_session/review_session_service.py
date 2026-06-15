from typing import Optional, List

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.base.base_service import BaseService
from backend.api_v1.base.mutation_response import MutationResponse
from backend.api_v1.review_session.review_session_repository import (
    ReviewSessionRepository,
)
from backend.api_v1.review_session.review_session_schema import (
    ReviewSession as ReviewSessionSchema,
    ReviewSessionCreate,
    ReviewSessionUpdate,
)
from backend.api_v1.employee.employee_schema import EmployeeSchema
from backend.api_v1.review_session.review_session_errors import (
    ReviewSessionNotFound,
    ReviewSessionDeleteError,
    ReviewSessionDeletePermission,
    ReviewSessionStatusError,
    ReviewSessionCannotCloseError,
)
from backend.api_v1.review_session.review_session_success import (
    ReviewSessionDeleteSuccess,
    ReviewSessionCreateSuccess,
    ReviewSessionUpdateSuccess,
    ReviewSessionOpenSuccess,
    ReviewSessionCloseSuccess,
    ReviewSessionRevertSuccess,
)
from backend.api_v1.review_session_employee.review_session_employee_model import (
    ReviewSessionEmployee,
)
from backend.api_v1.review_session_employee_evaluation.review_session_employee_evaluation_model import (
    ReviewSessionEmployeeEvaluation,
)
from backend.api_v1.review_session_employee_criterion_score.review_session_employee_criterion_score_model import (
    ReviewSessionEmployeeCriterionScore,
)
from backend.api_v1.review_session_employee_level.review_session_employee_level_model import (
    ReviewSessionEmployeeLevel,
)
from backend.api_v1.review_session_employee_level_answer.review_session_employee_level_answer_model import (
    ReviewSessionEmployeeLevelAnswer,
)
from backend.api_v1.employee.employee_model import Employee
from backend.api_v1.review_dimension.review_dimension_model import ReviewDimension


VALID_TRANSITIONS = {
    "pending": ["open"],
    "open": ["closed"],
    "closed": ["open"],  # revert is allowed
}


class ReviewSessionService(BaseService):
    def __init__(
        self,
        repository: ReviewSessionRepository,
        user: Optional[EmployeeSchema] = None,
        session: Optional[AsyncSession] = None,
    ):
        super().__init__(repository, user=user, session=session)

    async def get_by_id(self, id: int):
        result = await self.repository.get_by_id(id)
        if not result:
            exc = ReviewSessionNotFound(id)
            raise await self._resolve_domain_error(exc)
        return result

    def _to_schema(self, record) -> ReviewSessionSchema:
        schema = ReviewSessionSchema.model_validate(record)
        schema.employee_count = len(record.employees) if record.employees else 0
        return schema

    async def get_review_sessions(
        self,
        status: Optional[str] = None,
        sort: Optional[str] = None,
    ) -> List[ReviewSessionSchema]:
        filters = {}
        if status:
            filters["status"] = status
        records = await self.get_all(params=filters or None, sort_json=sort)
        return [self._to_schema(r) for r in records]

    async def create_review_session(
        self, rs_in: ReviewSessionCreate
    ) -> MutationResponse[ReviewSessionSchema]:
        record = await self.create(rs_in)
        schema = self._to_schema(record)
        detail = await self._resolve_domain_success(
            ReviewSessionCreateSuccess(schema.name)
        )
        return MutationResponse(detail=detail, data=schema)

    async def update_review_session(
        self, rs_id: int, rs_update: ReviewSessionUpdate
    ) -> MutationResponse[ReviewSessionSchema]:
        orm_record = await self.get_by_id(rs_id)
        updated = await self.update(orm_record, rs_update, partial=True)
        schema = self._to_schema(updated)
        detail = await self._resolve_domain_success(
            ReviewSessionUpdateSuccess(schema.name)
        )
        return MutationResponse(detail=detail, data=schema)

    async def open_session(self, rs_id: int) -> MutationResponse[ReviewSessionSchema]:
        orm_record = await self.get_by_id(rs_id)
        if "open" not in VALID_TRANSITIONS.get(orm_record.status, []):
            exc = ReviewSessionStatusError(orm_record.status, "open")
            raise await self._resolve_domain_error(exc)

        # Create RSE records for all active employees
        stmt = select(Employee).where(Employee.is_active == True)
        result = await self.session.execute(stmt)
        employees = result.scalars().all()

        # Get all active dimensions
        dim_stmt = select(ReviewDimension).where(ReviewDimension.is_active == True)
        dim_result = await self.session.execute(dim_stmt)
        dimensions = dim_result.scalars().all()

        for emp in employees:
            rse = ReviewSessionEmployee(
                session_id=rs_id,
                employee_id=emp.id,
                status="open",
            )
            self.session.add(rse)

        await self.session.flush()

        # Now create evaluation records for each RSE + dimension
        rse_stmt = select(ReviewSessionEmployee).where(
            ReviewSessionEmployee.session_id == rs_id
        )
        rse_result = await self.session.execute(rse_stmt)
        rse_records = rse_result.scalars().all()

        for rse in rse_records:
            for dim in dimensions:
                evaluation = ReviewSessionEmployeeEvaluation(
                    review_session_employee_id=rse.id,
                    dimension_id=dim.id,
                )
                self.session.add(evaluation)

        orm_record.status = "open"
        await self.session.commit()
        await self.session.refresh(orm_record)

        schema = self._to_schema(orm_record)
        detail = await self._resolve_domain_success(
            ReviewSessionOpenSuccess(schema.name)
        )
        return MutationResponse(detail=detail, data=schema)

    async def close_session(self, rs_id: int) -> MutationResponse[ReviewSessionSchema]:
        from sqlalchemy import select as sa_select
        from backend.api_v1.review_session_employee.review_session_employee_model import (
            ReviewSessionEmployee as RSEModel,
        )
        orm_record = await self.get_by_id(rs_id)
        if "closed" not in VALID_TRANSITIONS.get(orm_record.status, []):
            exc = ReviewSessionStatusError(orm_record.status, "closed")
            raise await self._resolve_domain_error(exc)

        # A session can only close once every employee review is "closed".
        not_closed_stmt = sa_select(RSEModel).where(
            RSEModel.session_id == rs_id,
            RSEModel.status != "closed",
        )
        result = await self.session.execute(not_closed_stmt)
        not_closed_employees = result.scalars().all()
        if not_closed_employees:
            exc = ReviewSessionCannotCloseError(len(not_closed_employees))
            raise await self._resolve_domain_error(exc)

        orm_record.status = "closed"
        await self.session.commit()
        await self.session.refresh(orm_record)

        schema = self._to_schema(orm_record)
        detail = await self._resolve_domain_success(
            ReviewSessionCloseSuccess(schema.name)
        )
        return MutationResponse(detail=detail, data=schema)

    async def revert_session(self, rs_id: int) -> MutationResponse[ReviewSessionSchema]:
        orm_record = await self.get_by_id(rs_id)
        if orm_record.status != "closed":
            exc = ReviewSessionStatusError(orm_record.status, "open")
            raise await self._resolve_domain_error(exc)

        orm_record.status = "open"
        await self.session.commit()
        await self.session.refresh(orm_record)

        schema = self._to_schema(orm_record)
        detail = await self._resolve_domain_success(
            ReviewSessionRevertSuccess(schema.name)
        )
        return MutationResponse(detail=detail, data=schema)

    async def delete_review_session(self, rs_id: int) -> None:
        """
        Cascade-delete a whole session and ALL its descendants in one transaction,
        deepest first:
          session -> employee reviews
                       -> evaluations -> criterion scores
                       -> levels      -> level answers
        FKs have no ON DELETE CASCADE, so every child is deleted explicitly — a
        missing one surfaces as the misleading "has employee reviews" error.
        Restricted to developers (the `dev` group).
        """
        from sqlalchemy import select as sa_select, delete as sa_delete

        groups = [g.lower() for g in (self.user.groups if self.user else [])]
        if "dev" not in groups:
            exc = ReviewSessionDeletePermission()
            raise await self._resolve_domain_error(exc)

        record = await self.get_by_id(rs_id)
        name = record.name

        try:
            # Collect employee-review ids for this session.
            rse_ids = (
                await self.session.execute(
                    sa_select(ReviewSessionEmployee.id).where(
                        ReviewSessionEmployee.session_id == rs_id
                    )
                )
            ).scalars().all()

            if rse_ids:
                eval_ids = (
                    await self.session.execute(
                        sa_select(ReviewSessionEmployeeEvaluation.id).where(
                            ReviewSessionEmployeeEvaluation.review_session_employee_id.in_(
                                rse_ids
                            )
                        )
                    )
                ).scalars().all()
                level_ids = (
                    await self.session.execute(
                        sa_select(ReviewSessionEmployeeLevel.id).where(
                            ReviewSessionEmployeeLevel.review_session_employee_id.in_(
                                rse_ids
                            )
                        )
                    )
                ).scalars().all()

                # 1) grandchildren
                if eval_ids:
                    await self.session.execute(
                        sa_delete(ReviewSessionEmployeeCriterionScore).where(
                            ReviewSessionEmployeeCriterionScore.review_session_employee_evaluation_id.in_(
                                eval_ids
                            )
                        )
                    )
                if level_ids:
                    await self.session.execute(
                        sa_delete(ReviewSessionEmployeeLevelAnswer).where(
                            ReviewSessionEmployeeLevelAnswer.review_session_employee_level_id.in_(
                                level_ids
                            )
                        )
                    )

                # 2) children of the employee review
                await self.session.execute(
                    sa_delete(ReviewSessionEmployeeEvaluation).where(
                        ReviewSessionEmployeeEvaluation.review_session_employee_id.in_(
                            rse_ids
                        )
                    )
                )
                await self.session.execute(
                    sa_delete(ReviewSessionEmployeeLevel).where(
                        ReviewSessionEmployeeLevel.review_session_employee_id.in_(
                            rse_ids
                        )
                    )
                )

                # 3) the employee reviews
                await self.session.execute(
                    sa_delete(ReviewSessionEmployee).where(
                        ReviewSessionEmployee.session_id == rs_id
                    )
                )

            # 4) the session
            await self.session.execute(
                sa_delete(self.repository.model).where(
                    self.repository.model.id == rs_id
                )
            )
            await self.session.commit()
        except IntegrityError:
            await self.session.rollback()
            exc = ReviewSessionDeleteError(name)
            raise await self._resolve_domain_error(exc)

        success = ReviewSessionDeleteSuccess(name)
        await self._raise_success(
            message_key=success.message_key,
            variables=success.template_vars,
            fallback=success.fallback,
        )

    async def get_analytics(self, rs_id: int) -> list[dict]:
        """
        Returns average score per dimension across all employees in the session.
        Only evaluations with a non-null score contribute to the average.
        """
        from sqlalchemy import select as sa_select, func
        from backend.api_v1.review_session_employee.review_session_employee_model import (
            ReviewSessionEmployee as RSEModel,
        )
        from backend.api_v1.review_session_employee_evaluation.review_session_employee_evaluation_model import (
            ReviewSessionEmployeeEvaluation as EvalModel,
        )
        from backend.api_v1.review_dimension.review_dimension_model import ReviewDimension

        stmt = (
            sa_select(
                ReviewDimension.id,
                ReviewDimension.name,
                ReviewDimension.key,
                ReviewDimension.description,
                func.count(EvalModel.id).label("total_evaluations"),
                func.count(EvalModel.score).label("scored_count"),
                func.avg(EvalModel.score).label("avg_score"),
                func.min(EvalModel.score).label("min_score"),
                func.max(EvalModel.score).label("max_score"),
            )
            .join(EvalModel, EvalModel.dimension_id == ReviewDimension.id)
            .join(RSEModel, RSEModel.id == EvalModel.review_session_employee_id)
            .where(RSEModel.session_id == rs_id)
            .group_by(ReviewDimension.id, ReviewDimension.name, ReviewDimension.key, ReviewDimension.description)
            .order_by(ReviewDimension.id)
        )

        result = await self.session.execute(stmt)
        rows = result.all()

        return [
            {
                "dimension_id": r.id,
                "dimension_name": r.name,
                "dimension_key": r.key,
                "dimension_description": r.description,
                "total_evaluations": r.total_evaluations,
                "scored_count": r.scored_count,
                "avg_score": round(float(r.avg_score), 2) if r.avg_score is not None else None,
                "min_score": r.min_score,
                "max_score": r.max_score,
            }
            for r in rows
        ]

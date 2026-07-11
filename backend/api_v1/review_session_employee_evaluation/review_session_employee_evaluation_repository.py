from sqlalchemy import select
from sqlalchemy.orm import raiseload

from backend.api_v1.base.base_repository import BaseRepository
from backend.api_v1.review_session_employee_evaluation.review_session_employee_evaluation_model import (
    ReviewSessionEmployeeEvaluation,
)


class ReviewSessionEmployeeEvaluationRepository(BaseRepository):
    model = ReviewSessionEmployeeEvaluation

    async def list_by_rse(self, rse_id: int):
        """Evaluations for one RSE, WITHOUT hydrating the review_session_employee
        back-ref: it is lazy="selectin", so loading the rows would otherwise drag
        the reviewed employee's whole Employee graph (~112 queries) on every call.
        dimension + criterion_scores stay eager — _to_schema needs them; nothing
        here reads .review_session_employee (its id is a plain column)."""
        stmt = (
            select(self.model)
            .where(self.model.review_session_employee_id == rse_id)
            .options(raiseload(self.model.review_session_employee))
            .order_by(self.model.id)
        )
        result = await self.session.scalars(stmt)
        return result.all()

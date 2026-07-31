from collections.abc import Sequence

from sqlalchemy import func, select

from backend.api_v1.base.base_repository import BaseRepository
from backend.api_v1.employee_fact.employee_fact_model import EmployeeFact
from backend.api_v1.employee_fact_evaluation_link.employee_fact_evaluation_link_model import (
    EmployeeFactEvaluationLink,
)
from backend.api_v1.employee_fact_type.employee_fact_type_model import EmployeeFactType
from backend.api_v1.review_session_employee_evaluation.review_session_employee_evaluation_model import (
    ReviewSessionEmployeeEvaluation,
)

# The columns every fact read returns, in schema order. Selecting COLUMNS rather
# than entities is deliberate: `EmployeeFact.employee_id` / `created_by_id` point
# at Employee, whose selectin graph is the documented people-review N+1.
_FACT_COLUMNS = (
    EmployeeFact.id,
    EmployeeFact.employee_id,
    EmployeeFact.employee_fact_type_id,
    EmployeeFactType.key.label("employee_fact_type_key"),
    EmployeeFact.text,
)


class EmployeeFactRepository(BaseRepository):
    model = EmployeeFact

    async def list_unlinked(self, employee_id: int) -> Sequence:
        """The employee's pool: facts not attached to any competence, oldest
        first (registration order — the order the user will work through them)."""
        stmt = (
            select(*_FACT_COLUMNS)
            .join(
                EmployeeFactType,
                EmployeeFactType.id == EmployeeFact.employee_fact_type_id,
            )
            .outerjoin(
                EmployeeFactEvaluationLink,
                EmployeeFactEvaluationLink.employee_fact_id == EmployeeFact.id,
            )
            .where(
                EmployeeFact.employee_id == employee_id,
                EmployeeFactEvaluationLink.id.is_(None),
            )
            .order_by(EmployeeFact.id)
        )
        return (await self.session.execute(stmt)).all()

    async def list_by_evaluation_ids(self, evaluation_ids: list[int]) -> Sequence:
        """Every fact attached to any of these competences, in display order.
        One query for the whole page — never one per evaluation."""
        if not evaluation_ids:
            return []
        stmt = (
            select(
                *_FACT_COLUMNS,
                EmployeeFactEvaluationLink.review_session_employee_evaluation_id,
                EmployeeFactEvaluationLink.sort_order,
            )
            .join(
                EmployeeFactType,
                EmployeeFactType.id == EmployeeFact.employee_fact_type_id,
            )
            .join(
                EmployeeFactEvaluationLink,
                EmployeeFactEvaluationLink.employee_fact_id == EmployeeFact.id,
            )
            .where(
                EmployeeFactEvaluationLink.review_session_employee_evaluation_id.in_(
                    evaluation_ids
                )
            )
            .order_by(
                EmployeeFactEvaluationLink.review_session_employee_evaluation_id,
                EmployeeFactEvaluationLink.sort_order,
                EmployeeFact.id,
            )
        )
        return (await self.session.execute(stmt)).all()

    async def get_row(self, fact_id: int) -> Sequence | None:
        """One fact + its link state, as columns."""
        stmt = (
            select(
                *_FACT_COLUMNS,
                EmployeeFactEvaluationLink.review_session_employee_evaluation_id,
                EmployeeFactEvaluationLink.sort_order,
            )
            .join(
                EmployeeFactType,
                EmployeeFactType.id == EmployeeFact.employee_fact_type_id,
            )
            .outerjoin(
                EmployeeFactEvaluationLink,
                EmployeeFactEvaluationLink.employee_fact_id == EmployeeFact.id,
            )
            .where(EmployeeFact.id == fact_id)
        )
        return (await self.session.execute(stmt)).first()

    async def next_sort_order(self, evaluation_id: int, type_id: int) -> int:
        """One past the last position in that competence's list of that kind."""
        stmt = (
            select(func.max(EmployeeFactEvaluationLink.sort_order))
            .join(
                EmployeeFact,
                EmployeeFact.id == EmployeeFactEvaluationLink.employee_fact_id,
            )
            .where(
                EmployeeFactEvaluationLink.review_session_employee_evaluation_id
                == evaluation_id,
                EmployeeFact.employee_fact_type_id == type_id,
            )
        )
        current = await self.session.scalar(stmt)
        return 0 if current is None else current + 1

    async def count_evaluations_with_facts(
        self, rse_ids: list[int], type_key: str
    ) -> dict[int, int]:
        """Per review record: how many of its competences carry at least one fact
        of this kind. ONE grouped query for the whole roster — the roster used to
        read a text column off each already-loaded evaluation, and a per-row
        relationship here would reintroduce the documented people-review N+1."""
        if not rse_ids:
            return {}
        stmt = (
            select(
                ReviewSessionEmployeeEvaluation.review_session_employee_id,
                func.count(func.distinct(ReviewSessionEmployeeEvaluation.id)),
            )
            .join(
                EmployeeFactEvaluationLink,
                EmployeeFactEvaluationLink.review_session_employee_evaluation_id
                == ReviewSessionEmployeeEvaluation.id,
            )
            .join(
                EmployeeFact,
                EmployeeFact.id == EmployeeFactEvaluationLink.employee_fact_id,
            )
            .join(
                EmployeeFactType,
                EmployeeFactType.id == EmployeeFact.employee_fact_type_id,
            )
            .where(
                ReviewSessionEmployeeEvaluation.review_session_employee_id.in_(rse_ids),
                EmployeeFactType.key == type_key,
            )
            .group_by(ReviewSessionEmployeeEvaluation.review_session_employee_id)
        )
        rows = (await self.session.execute(stmt)).all()
        return {rse_id: count for rse_id, count in rows}

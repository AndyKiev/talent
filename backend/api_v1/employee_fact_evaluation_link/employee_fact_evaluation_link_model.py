from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.api_v1.base.base_model import Base
from backend.api_v1.base.models import IntIdPkMixin, TimestampMixin

if TYPE_CHECKING:
    from backend.api_v1.employee_fact.employee_fact_model import EmployeeFact


class EmployeeFactEvaluationLink(IntIdPkMixin, TimestampMixin, Base):
    """
    Attaches ONE employee fact to ONE competence evaluation, at a position.

    The whole point of the separate table is that "not yet attached" is a real,
    counted state — the pool a user registers into before they have decided
    which competence a fact proves. Modelling it as a nullable
    `review_session_employee_evaluation_id` would have made `sort_order`
    meaningless on those rows too; here the ABSENCE of a link row is the empty
    state, exactly like the other row-backed review lists.

    UNIQUE on `employee_fact_id`: a fact proves at most one competence at a
    time. Moving it is an update of this row; sending it back to the pool is a
    DELETE of this row and never touches the authored text.

    CASCADE on both sides: deleting the fact takes its link; deleting an
    evaluation (a competence dropped from a session) returns its facts to the
    unlinked pool instead of destroying authored content.
    """

    __tablename__ = "employee_fact_evaluation_links"

    employee_fact_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("employee_facts.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
    )
    review_session_employee_evaluation_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("review_session_employee_evaluations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    # Position within its competence's list of the same kind (0, 1, 2 …) — what
    # the reader sees as "1., 2., 3.".
    sort_order: Mapped[int] = mapped_column(
        Integer, nullable=False, server_default="0", default=0
    )

    fact: Mapped["EmployeeFact"] = relationship(back_populates="link")

    def __repr__(self) -> str:
        return (
            f"<EmployeeFactEvaluationLink(id={self.id}, "
            f"employee_fact_id={self.employee_fact_id}, "
            f"review_session_employee_evaluation_id={self.review_session_employee_evaluation_id})>"
        )

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Integer, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.api_v1.base.base_model import Base
from backend.api_v1.base.models import IntIdPkMixin, TimestampMixin

if TYPE_CHECKING:
    from backend.api_v1.employee_fact_evaluation_link.employee_fact_evaluation_link_model import (
        EmployeeFactEvaluationLink,
    )
    from backend.api_v1.employee_fact_type.employee_fact_type_model import (
        EmployeeFactType,
    )


class EmployeeFact(IntIdPkMixin, TimestampMixin, Base):
    """
    One numbered line about an employee — a fact / achievement, or a direction
    for improvement.

    Was one line inside the numbered text of
    `review_session_employee_evaluations.facts` / `.improvement`. Two things
    change by making it a row:

    - **The order is a column, not the text.** Nothing stores "1." / "2." — the
      position comes from `employee_fact_evaluation_links.sort_order`, so
      reordering on the screen never rewrites the wording.
    - **The owner is the EMPLOYEE, not the review.** A fact can be registered the
      moment it is noticed, with no competence chosen and no open review session,
      and attached to a competence later. Which competence (if any) it currently
      proves lives in the link table, so "unlinked" is the ABSENCE of a link row
      rather than a nullable column.

    Authorship is recorded but not displayed: any of the people who may see the
    employee's review (themself, their oversight manager, their supervisor) may
    edit, move or delete any of these rows regardless of who wrote it — the
    columns exist so the history is recoverable, not to gate anything.
    """

    __tablename__ = "employee_facts"

    employee_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("employees.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    employee_fact_type_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("employee_fact_types.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    text: Mapped[str] = mapped_column(Text, nullable=False)
    # Who wrote it / who last touched it. RESTRICT for the same reason
    # `recruitment_candidate_notes.created_by` uses it: deleting a person must not silently
    # rewrite authored content out of existence.
    created_by_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("employees.id", ondelete="RESTRICT"),
        nullable=False,
    )
    updated_by_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("employees.id", ondelete="RESTRICT"),
        nullable=False,
    )
    # TimestampMixin only carries created_at, and "who last edited, and when" is
    # a requirement here — so the edit stamp is declared explicitly.
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )

    fact_type: Mapped["EmployeeFactType"] = relationship(
        back_populates="facts",
        lazy="selectin",
    )
    # 0..1 — the link row exists only while the fact is attached to a competence.
    # NOLOAD: the reads that need it join explicitly (the evaluation lists, the
    # unlinked pool), and the employee/author sides are never eager-loaded at all
    # (a full Employee eager-load drags its whole selectin graph).
    link: Mapped["EmployeeFactEvaluationLink | None"] = relationship(
        back_populates="fact",
        lazy="noload",
        uselist=False,
        cascade="all, delete-orphan",
    )

    def __repr__(self) -> str:
        return f"<EmployeeFact(id={self.id}, employee_id={self.employee_id})>"

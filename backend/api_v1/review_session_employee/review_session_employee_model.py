from typing import TYPE_CHECKING, List, Optional
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import Boolean, String, Text, Integer, ForeignKey, UniqueConstraint
from backend.api_v1.base.base_model import Base
from backend.api_v1.base.models import IntIdPkMixin, TimestampMixin

if TYPE_CHECKING:
    from backend.api_v1.review_session.review_session_model import ReviewSession
    from backend.api_v1.employee.employee_model import Employee
    from backend.api_v1.review_session_employee_evaluation.review_session_employee_evaluation_model import (
        ReviewSessionEmployeeEvaluation,
    )


class ReviewSessionEmployee(IntIdPkMixin, TimestampMixin, Base):
    __tablename__ = "review_session_employees"
    # One review row per (session, employee): hard backstop behind the
    # add_employee check-then-insert guard (prevents concurrent double-add).
    __table_args__ = (
        UniqueConstraint("session_id", "employee_id", name="uq_rse_session_employee"),
    )
    session_id: Mapped[int] = mapped_column(
        ForeignKey("review_sessions.id"), nullable=False
    )
    employee_id: Mapped[int] = mapped_column(ForeignKey("employees.id"), nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="open")

    # Presentation-queue order for oversight mode (multiples of 10: 10, 20, 30 …).
    # NULL sorts last, so a newly-added employee lands at the end of the queue.
    queue_position: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    # Free-text employee-filled fields for this review (per-session).
    employee_feedback: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    manager_feedback: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    # Numbered list serialized like evaluation facts ("1. ...\n2. ...").
    results_achievements: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    # NOTE: there is deliberately no `development_plan` column here any more. The
    # individual development plan (once a JSON array of missions on this row)
    # moved to the employee-scoped `employee_missions` tables, because a plan
    # belongs to the person, not to one review session — see
    # `backend/api_v1/aa__process_descriptions/employee_missions_design.md`.
    # Required trainings, courses, internships, etc. (free text).
    trainings: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    # Competence summary — JSON {"strong": [...], "develop": [...]}, each item
    # {"dimension_key": str, "comments": [str, ...]}.
    competence_summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    # Per-review opt-in: when True the two summary selects offer the FULL competence
    # list (not just the top/bottom ranked) and a star re-rating no longer removes a
    # picked competence + its facts. Only usable when the global app setting
    # `people_review_summary_full_competence_list` is on (that gates the switch's
    # visibility). Default False → the review behaves as before.
    summary_full_competence_list: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default="false", default=False
    )

    session: Mapped["ReviewSession"] = relationship(
        back_populates="employees",
        lazy="selectin",
    )
    employee: Mapped["Employee"] = relationship(lazy="selectin")
    evaluations: Mapped[List["ReviewSessionEmployeeEvaluation"]] = relationship(
        back_populates="review_session_employee",
        lazy="selectin",
    )

from typing import TYPE_CHECKING, List, Optional
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import String, Text, ForeignKey
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
    session_id: Mapped[int] = mapped_column(
        ForeignKey("review_sessions.id"), nullable=False
    )
    employee_id: Mapped[int] = mapped_column(
        ForeignKey("employees.id"), nullable=False
    )
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="open")

    # Free-text employee-filled fields for this review (per-session).
    employee_feedback: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    manager_feedback: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    # Numbered list serialized like evaluation facts ("1. ...\n2. ...").
    results_achievements: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    # Individual development plan — JSON array of mission strings (count flexible).
    development_plan: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    # Required trainings, courses, internships, etc. (free text).
    trainings: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    # Competence summary — JSON {"strong": [...], "develop": [...]}, each item
    # {"dimension_key": str, "comments": [str, ...]}.
    competence_summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    session: Mapped["ReviewSession"] = relationship(
        back_populates="employees",
        lazy="selectin",
    )
    employee: Mapped["Employee"] = relationship(lazy="selectin")
    evaluations: Mapped[List["ReviewSessionEmployeeEvaluation"]] = relationship(
        back_populates="review_session_employee",
        lazy="selectin",
    )

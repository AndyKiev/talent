from typing import TYPE_CHECKING, List
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import ForeignKey
from backend.api_v1.base.base_model import Base
from backend.api_v1.base.models import IntIdPkMixin, TimestampMixin

if TYPE_CHECKING:
    from backend.api_v1.review_session_employee.review_session_employee_model import (
        ReviewSessionEmployee,
    )
    from backend.api_v1.review_level.review_level_model import ReviewLevel
    from backend.api_v1.review_session_employee_level_answer.review_session_employee_level_answer_model import (
        ReviewSessionEmployeeLevelAnswer,
    )


class ReviewSessionEmployeeLevel(IntIdPkMixin, TimestampMixin, Base):
    """The target ('proposed') level an employee registers for in a review.

    One row per review_session_employee (unique). Each linked answer holds the
    employee's numbered comments against a single requirement of that level.
    """

    __tablename__ = "review_session_employee_levels"
    review_session_employee_id: Mapped[int] = mapped_column(
        ForeignKey("review_session_employees.id"), nullable=False, unique=True
    )
    level_id: Mapped[int] = mapped_column(
        ForeignKey("review_levels.id"), nullable=False
    )

    level: Mapped["ReviewLevel"] = relationship(lazy="selectin")
    answers: Mapped[List["ReviewSessionEmployeeLevelAnswer"]] = relationship(
        back_populates="registration",
        lazy="selectin",
        cascade="all, delete-orphan",
    )

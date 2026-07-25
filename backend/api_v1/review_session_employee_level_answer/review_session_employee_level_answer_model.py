from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.api_v1.base.base_model import Base
from backend.api_v1.base.models import IntIdPkMixin, TimestampMixin

if TYPE_CHECKING:
    from backend.api_v1.review_level_requirement.review_level_requirement_model import (
        ReviewLevelRequirement,
    )
    from backend.api_v1.review_session_employee_level.review_session_employee_level_model import (
        ReviewSessionEmployeeLevel,
    )


class ReviewSessionEmployeeLevelAnswer(IntIdPkMixin, TimestampMixin, Base):
    __tablename__ = "review_session_employee_level_answers"
    review_session_employee_level_id: Mapped[int] = mapped_column(
        ForeignKey("review_session_employee_levels.id"), nullable=False
    )
    requirement_id: Mapped[int] = mapped_column(
        ForeignKey("review_level_requirements.id"), nullable=False
    )
    # Numbered list serialized like evaluation facts ("1. ...\n2. ...").
    facts: Mapped[str | None] = mapped_column(Text, nullable=True)

    registration: Mapped["ReviewSessionEmployeeLevel"] = relationship(
        back_populates="answers",
        lazy="selectin",
    )
    requirement: Mapped["ReviewLevelRequirement"] = relationship(lazy="selectin")

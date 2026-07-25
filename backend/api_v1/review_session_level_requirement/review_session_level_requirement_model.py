from typing import TYPE_CHECKING

from backend.api_v1.base.base_model import Base
from backend.api_v1.base.models import IntIdPkMixin, TimestampMixin
from sqlalchemy import ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

if TYPE_CHECKING:
    from backend.api_v1.review_session_level.review_session_level_model import (
        ReviewSessionLevel,
    )


class ReviewSessionLevelRequirement(IntIdPkMixin, TimestampMixin, Base):
    """A level requirement (level description) frozen into a session at open time.

    Child of ReviewSessionLevel. text_key + sort_order are COPIED from the live
    requirement; source_requirement_id keeps the live id so saved employee
    answers (which reference the LIVE requirement id) can be matched back to the
    frozen requirement for display. Mirrors ReviewSessionCriterion semantics.
    """

    __tablename__ = "review_session_level_requirements"
    session_level_id: Mapped[int] = mapped_column(
        ForeignKey("review_session_levels.id"), nullable=False
    )
    # Live requirement this was copied from; ON DELETE SET NULL so a frozen
    # requirement whose source is later deleted keeps its text copy (the back-link
    # used to map employee answers is cleared).
    source_requirement_id: Mapped[int | None] = mapped_column(
        ForeignKey("review_level_requirements.id", ondelete="SET NULL"),
        nullable=True,
    )
    text_key: Mapped[str] = mapped_column(String(128), nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    session_level: Mapped["ReviewSessionLevel"] = relationship(
        back_populates="requirements",
        lazy="selectin",
    )

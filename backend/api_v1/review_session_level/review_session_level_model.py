from typing import TYPE_CHECKING

from backend.api_v1.base.base_model import Base
from backend.api_v1.base.models import IntIdPkMixin, TimestampMixin
from sqlalchemy import ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

if TYPE_CHECKING:
    from backend.api_v1.review_session.review_session_model import ReviewSession
    from backend.api_v1.review_session_level_requirement.review_session_level_requirement_model import (
        ReviewSessionLevelRequirement,
    )


class ReviewSessionLevel(IntIdPkMixin, TimestampMixin, Base):
    """A competency level frozen into a session at open time.

    One row per (session, active level). The translation keys + sort_order are
    COPIED so the level set/order a review uses stays fixed even if the live
    levels are later edited, reordered or deactivated. Mirrors
    ReviewSessionCriterion. NOT per employee — session scoped.
    """

    __tablename__ = "review_session_levels"
    session_id: Mapped[int] = mapped_column(
        ForeignKey("review_sessions.id"), nullable=False
    )
    # Live level this was copied from; NULL when the source level was later
    # deleted. ON DELETE SET NULL so an admin can still delete a live level
    # that's already frozen into a session — the key copy survives, only the
    # back-link (used to map the employee's live current_level_id) is cleared.
    source_level_id: Mapped[int | None] = mapped_column(
        ForeignKey("review_levels.id", ondelete="SET NULL"), nullable=True
    )
    name_key: Mapped[str] = mapped_column(String(128), nullable=False)
    description_key: Mapped[str | None] = mapped_column(String(128), nullable=True)
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    session: Mapped["ReviewSession"] = relationship(lazy="selectin")
    requirements: Mapped[list["ReviewSessionLevelRequirement"]] = relationship(
        back_populates="session_level",
        lazy="selectin",
    )

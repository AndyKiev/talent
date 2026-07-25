from typing import TYPE_CHECKING

from backend.api_v1.base.base_model import Base
from backend.api_v1.base.models import IntIdPkMixin, TimestampMixin
from sqlalchemy import ForeignKey, Integer, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

if TYPE_CHECKING:
    from backend.api_v1.review_dimension.review_dimension_model import ReviewDimension
    from backend.api_v1.review_session.review_session_model import ReviewSession


class ReviewSessionCriterion(IntIdPkMixin, TimestampMixin, Base):
    """A criterion (behaviour descriptor) frozen into a session at open time.

    One row per (session, dimension, criterion). The `text` is COPIED so the
    review's per-descriptor scores (kept by position via `criterion_index`)
    stay valid forever, even if the source criterion is later edited, reordered,
    deactivated or deleted. Session+dimension scoped — NOT per employee.
    """

    __tablename__ = "review_session_criterions"
    session_id: Mapped[int] = mapped_column(
        ForeignKey("review_sessions.id"), nullable=False
    )
    dimension_id: Mapped[int] = mapped_column(
        ForeignKey("review_dimensions.id"), nullable=False
    )
    # Live criterion this was copied from; NULL when it came from a legacy hint
    # backfill or the source criterion was later deleted. ON DELETE SET NULL so an
    # admin can still delete a criterion that's already frozen into a session — the
    # text copy survives, only the back-link is cleared (the whole point of freezing).
    source_criteria_id: Mapped[int | None] = mapped_column(
        ForeignKey("review_dimension_criterias.id", ondelete="SET NULL"),
        nullable=True,
    )
    text: Mapped[str] = mapped_column(Text, nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    session: Mapped["ReviewSession"] = relationship(lazy="selectin")
    dimension: Mapped["ReviewDimension"] = relationship(lazy="selectin")

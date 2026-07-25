from sqlalchemy import Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from backend.api_v1.base.base_model import Base
from backend.api_v1.base.models.utils.mixins import IntIdPkMixin, TimestampMixin


class CandidateSource(IntIdPkMixin, TimestampMixin, Base):
    """Where a candidate came from (e.g. ``linkedin`` / ``referral`` / ``agency``).

    Identity is the snake_case ``key``; the human label is resolved on the
    frontend via ``getString(snakeToCamel(key))`` — there is no stored name.
    ``sort_order`` drives the in-grid arrow reorder.
    """

    __tablename__ = "candidate_sources"

    key: Mapped[str] = mapped_column(String(64), nullable=False, unique=True)
    description: Mapped[str | None] = mapped_column(String(256), nullable=True)
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    def __repr__(self) -> str:
        return f"<CandidateSource(id={self.id}, key='{self.key}')>"

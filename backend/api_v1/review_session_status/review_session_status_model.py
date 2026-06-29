from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import String
from backend.api_v1.base.base_model import Base
from backend.api_v1.base.models.utils.mixins import IntIdPkMixin, TimestampMixin
from typing import TYPE_CHECKING

from backend.utils.enums import REVIEW_SESSION_ACTIVE_STATUS_KEYS

if TYPE_CHECKING:
    from backend.api_v1.review_session.review_session_model import ReviewSession


class ReviewSessionStatus(IntIdPkMixin, TimestampMixin, Base):
    __tablename__ = "review_session_statuses"

    key: Mapped[str] = mapped_column(String(16), nullable=False, unique=True)
    name: Mapped[str] = mapped_column(String(64), nullable=False)
    description: Mapped[str | None] = mapped_column(String(256), nullable=True)

    sessions: Mapped[list["ReviewSession"]] = relationship(
        back_populates="status_rel",
        lazy="selectin",
    )

    @property
    def is_active(self) -> bool:
        """pending/open are active; closed is inactive."""
        return self.key in REVIEW_SESSION_ACTIVE_STATUS_KEYS

    def __repr__(self) -> str:
        return (
            f"<ReviewSessionStatus(id={self.id}, key='{self.key}', name='{self.name}')>"
        )

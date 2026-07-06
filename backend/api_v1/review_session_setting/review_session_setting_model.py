from typing import TYPE_CHECKING, Any, Optional
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import String, ForeignKey, JSON, UniqueConstraint
from backend.api_v1.base.base_model import Base
from backend.api_v1.base.models import IntIdPkMixin, TimestampMixin

if TYPE_CHECKING:
    from backend.api_v1.review_session.review_session_model import ReviewSession


class ReviewSessionSetting(IntIdPkMixin, TimestampMixin, Base):
    """An app setting frozen into a session at open time.

    One row per (session, app-setting key). The key + JSON value are COPIED
    from `app_settings` for every setting whose key matches the people-review
    prefixes (see FROZEN_SETTING_PREFIXES in the review session service), so
    the parameters a session was opened under stay inspectable even after the
    live settings change. Read-only snapshot — nothing reads it back at
    runtime. Mirrors ReviewSessionCriterion semantics.
    """

    __tablename__ = "review_session_settings"

    __table_args__ = (
        UniqueConstraint(
            "session_id",
            "key",
            name="uq_review_session_setting",
        ),
    )

    session_id: Mapped[int] = mapped_column(
        ForeignKey("review_sessions.id"), nullable=False, index=True
    )
    key: Mapped[str] = mapped_column(String(64), nullable=False)
    value: Mapped[Optional[Any]] = mapped_column(JSON, nullable=True)

    session: Mapped["ReviewSession"] = relationship(lazy="selectin")

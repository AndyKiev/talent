from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import String, Integer, Date, ForeignKey
from datetime import date
from backend.api_v1.base.base_model import Base
from backend.api_v1.base.models.utils.mixins import IntIdPkMixin, TimestampMixin
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from backend.api_v1.planning.plan_session_status.plan_session_status_model import (
        PlanSessionStatus,
    )
    from backend.api_v1.planning.plan_session_category.plan_session_category_model import (
        PlanSessionCategory,
    )
    from backend.api_v1.planning.plan_scope.plan_scope_model import PlanScope


class PlanSession(IntIdPkMixin, TimestampMixin, Base):
    """A planning session: a dated window during which plan targets are set.

    Sessions cannot overlap by date. A new session is created in 'pending'.
    Its category + scope config is snapshotted from the defaults at creation
    so each year's report is reproducible in that year's configuration.
    """

    __tablename__ = "plan_sessions"

    name: Mapped[str] = mapped_column(String(64), nullable=False)
    description: Mapped[str | None] = mapped_column(String(256), nullable=True)
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date] = mapped_column(Date, nullable=False)
    plan_session_status_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("plan_session_statuses.id"),
        nullable=False,
    )

    status: Mapped["PlanSessionStatus"] = relationship(
        back_populates="sessions",
        lazy="selectin",
    )
    categories: Mapped[list["PlanSessionCategory"]] = relationship(
        back_populates="plan_session",
        lazy="selectin",
        cascade="all, delete-orphan",
    )
    scopes: Mapped[list["PlanScope"]] = relationship(
        back_populates="plan_session",
        lazy="selectin",
        cascade="all, delete-orphan",
    )

    @property
    def is_active(self) -> bool:
        """Proxied from status (pending/open are active; closed is not)."""
        return self.status.is_active if self.status else False

    def __repr__(self) -> str:
        return (
            f"<PlanSession(id={self.id}, name='{self.name}', "
            f"start_date={self.start_date}, end_date={self.end_date}, "
            f"status_id={self.plan_session_status_id})>"
        )

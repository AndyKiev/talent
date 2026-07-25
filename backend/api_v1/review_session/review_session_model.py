import datetime
from typing import TYPE_CHECKING

from sqlalchemy import Date, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.api_v1.base.base_model import Base
from backend.api_v1.base.models import IntIdPkMixin, TimestampMixin

if TYPE_CHECKING:
    from backend.api_v1.review_session_department.review_session_department_model import (
        ReviewSessionDepartment,
    )
    from backend.api_v1.review_session_employee.review_session_employee_model import (
        ReviewSessionEmployee,
    )
    from backend.api_v1.review_session_status.review_session_status_model import (
        ReviewSessionStatus,
    )


class ReviewSession(IntIdPkMixin, TimestampMixin, Base):
    __tablename__ = "review_sessions"
    name: Mapped[str] = mapped_column(String(256), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    status_id: Mapped[int] = mapped_column(ForeignKey("review_session_statuses.id"), nullable=False)
    period_start: Mapped[datetime.date | None] = mapped_column(Date, nullable=True)
    period_end: Mapped[datetime.date | None] = mapped_column(Date, nullable=True)

    status_rel: Mapped["ReviewSessionStatus"] = relationship(
        back_populates="sessions",
        lazy="selectin",
    )

    @property
    def status(self) -> str:
        """Backward-compatible accessor that returns the status key string."""
        return self.status_rel.key if self.status_rel else "pending"

    employees: Mapped[list["ReviewSessionEmployee"]] = relationship(
        back_populates="session",
        lazy="selectin",
    )
    departments: Mapped[list["ReviewSessionDepartment"]] = relationship(
        back_populates="session",
        lazy="selectin",
        viewonly=True,
    )

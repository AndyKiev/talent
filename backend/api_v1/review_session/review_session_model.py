from typing import TYPE_CHECKING, List
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import String, Text, Date
from backend.api_v1.base.base_model import Base
from backend.api_v1.base.models import IntIdPkMixin, TimestampMixin
import datetime

if TYPE_CHECKING:
    from backend.api_v1.review_session_employee.review_session_employee_model import (
        ReviewSessionEmployee,
    )


class ReviewSession(IntIdPkMixin, TimestampMixin, Base):
    __tablename__ = "review_sessions"
    name: Mapped[str] = mapped_column(String(256), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="pending")
    period_start: Mapped[datetime.date | None] = mapped_column(Date, nullable=True)
    period_end: Mapped[datetime.date | None] = mapped_column(Date, nullable=True)

    employees: Mapped[List["ReviewSessionEmployee"]] = relationship(
        back_populates="session",
        lazy="selectin",
    )

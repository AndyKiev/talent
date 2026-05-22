from __future__ import annotations

from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import String, Text
from typing import TYPE_CHECKING

from backend.api_v1.base.base_model import Base
from backend.api_v1.base.models.utils.mixins import IntIdPkMixin

if TYPE_CHECKING:
    from backend.api_v1.employee_events.employee_event.employee_event_model import EmployeeEvent


class EmployeeEventStatus(IntIdPkMixin, Base):
    __tablename__ = "employee_event_statuses"

    name: Mapped[str] = mapped_column(String(32), nullable=False, unique=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    events: Mapped[list["EmployeeEvent"]] = relationship(
        back_populates="status",
        lazy="selectin",
    )

    def __repr__(self) -> str:
        return f"<EmployeeEventStatus(id={self.id}, name='{self.name}')>"

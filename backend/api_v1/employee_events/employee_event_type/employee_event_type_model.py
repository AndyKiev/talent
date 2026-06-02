from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import String, Text
from typing import TYPE_CHECKING

from backend.api_v1.base.base_model import Base
from backend.api_v1.base.models import IntIdPkMixin, TimestampMixin


if TYPE_CHECKING:
    from backend.api_v1.employee_events.employee_event_type_direction.employee_event_type_direction_model import (
        EmployeeEventTypeDirection,
    )
    from backend.api_v1.employee_events.employee_event.employee_event_model import EmployeeEvent


class EmployeeEventType(IntIdPkMixin, TimestampMixin, Base):
    """
    HRM-managed lookup. Each instance is a named career event category,
    e.g. "Activation", "Job transfer", "Temporary leave".

    The `type_directions` relationship defines which direction types
    are required (or optional) when an HRM creates an event of this type.
    """

    __tablename__ = "employee_event_types"

    name: Mapped[str] = mapped_column(String(128), unique=True, nullable=False)
    code: Mapped[str] = mapped_column(String(64), nullable=False, unique=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    type_directions: Mapped[list["EmployeeEventTypeDirection"]] = relationship(
        back_populates="event_type",
        lazy="selectin",
        cascade="all, delete-orphan",
    )
    events: Mapped[list["EmployeeEvent"]] = relationship(
        back_populates="event_type",
        lazy="selectin",
    )

    def __repr__(self) -> str:
        return f"<EmployeeEventType(id={self.id}, name='{self.name}')>"

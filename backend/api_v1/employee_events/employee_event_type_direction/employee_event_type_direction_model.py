from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import ForeignKey, Boolean, Integer, UniqueConstraint
from typing import TYPE_CHECKING

from backend.api_v1.base.base_model import Base
from backend.api_v1.base.models import IntIdPkMixin


if TYPE_CHECKING:
    from backend.api_v1.employee_events.employee_event_type.employee_event_type_model import EmployeeEventType
    from backend.api_v1.employee_events.employee_event_direction_type.employee_event_direction_type_model import (
        EmployeeEventDirectionType,
    )


class EmployeeEventTypeDirection(IntIdPkMixin, Base):
    """
    Defines which direction types belong to a given event type, and
    whether each direction is mandatory for that event type.

    `sort_order` controls the display order of direction fields in the
    HRM form when creating a new event of this type.

    Uniqueness: one event type cannot reference the same direction type twice.
    """

    __tablename__ = "employee_event_type_directions"
    __table_args__ = (
        UniqueConstraint(
            "event_type_id",
            "direction_type_id",
            name="uq_event_type_direction",
        ),
    )

    event_type_id: Mapped[int] = mapped_column(
        ForeignKey("employee_event_types.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    direction_type_id: Mapped[int] = mapped_column(
        ForeignKey("employee_event_direction_types.id", ondelete="RESTRICT"),
        nullable=False,
    )
    is_required: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    event_type: Mapped["EmployeeEventType"] = relationship(
        back_populates="type_directions",
        lazy="selectin",
    )
    direction_type: Mapped["EmployeeEventDirectionType"] = relationship(
        back_populates="type_directions",
        lazy="selectin",
    )

    def __repr__(self) -> str:
        return (
            f"<EmployeeEventTypeDirection("
            f"event_type_id={self.event_type_id}, "
            f"direction_type_id={self.direction_type_id}, "
            f"is_required={self.is_required}"
            f")>"
        )

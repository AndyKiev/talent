from __future__ import annotations

from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import ForeignKey, String, Text, Date
from typing import TYPE_CHECKING
import datetime

from backend.api_v1.base.base_model import Base
from backend.api_v1.base.models import IntIdPkMixin, TimestampMixin


if TYPE_CHECKING:
    from backend.api_v1.employee.employee_model import Employee
    from backend.api_v1.employee_events.employee_event_type.employee_event_type_model import EmployeeEventType
    from backend.api_v1.employee_events.employee_event_change.employee_event_change_model import EmployeeEventChange
    from backend.api_v1.employee_events.employee_event_status.employee_event_status_model import EmployeeEventStatus


class EmployeeEvent(IntIdPkMixin, TimestampMixin, Base):
    """
    One career event for an employee, created manually by an HRM.

    `effective_date` is the date the changes take effect — this is the
    field that may need correction after a mistake. Running the reapply
    script after correcting it restores correct current state by
    replaying all events in effective_date order.

    `status_id` references `employee_event_statuses` (e.g. draft / applied).
    `created_by` points to the HRM employee who created this event.
    """

    __tablename__ = "employee_events"

    employee_id: Mapped[int] = mapped_column(
        ForeignKey("employees.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    event_type_id: Mapped[int] = mapped_column(
        ForeignKey("employee_event_types.id", ondelete="RESTRICT"),
        nullable=False,
    )
    status_id: Mapped[int] = mapped_column(
        ForeignKey("employee_event_statuses.id", ondelete="RESTRICT"),
        nullable=False,
    )
    effective_date: Mapped[datetime.date] = mapped_column(Date, nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_by: Mapped[int] = mapped_column(
        ForeignKey("employees.id", ondelete="RESTRICT"),
        nullable=False,
    )

    employee: Mapped["Employee"] = relationship(
        foreign_keys=[employee_id],
        back_populates="events",
        lazy="selectin",
    )
    creator: Mapped["Employee"] = relationship(
        foreign_keys=[created_by],
        lazy="selectin",
    )
    event_type: Mapped["EmployeeEventType"] = relationship(
        back_populates="events",
        lazy="selectin",
    )
    status: Mapped["EmployeeEventStatus"] = relationship(
        back_populates="events",
        lazy="selectin",
    )
    changes: Mapped[list["EmployeeEventChange"]] = relationship(
        back_populates="event",
        lazy="selectin",
        cascade="all, delete-orphan",
    )

    def __repr__(self) -> str:
        return (
            f"<EmployeeEvent("
            f"id={self.id}, "
            f"employee_id={self.employee_id}, "
            f"effective_date={self.effective_date}, "
            f"status_id={self.status_id}"
            f")>"
        )

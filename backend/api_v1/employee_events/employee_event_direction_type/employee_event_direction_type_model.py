from typing import TYPE_CHECKING

from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.api_v1.base.base_model import Base
from backend.api_v1.base.models import IntIdPkMixin

if TYPE_CHECKING:
    from backend.api_v1.employee_events.employee_event_change.employee_event_change_model import (
        EmployeeEventChange,
    )
    from backend.api_v1.employee_events.employee_event_type_direction.employee_event_type_direction_model import (
        EmployeeEventTypeDirection,
    )


class EmployeeEventDirectionType(IntIdPkMixin, Base):
    """
    Seeded lookup — the 4 fundamental kinds of change that can appear
    inside an event. Treated like an enum in application code; switch
    on `code` in the reapply script.

    Seed values:
        MAIN_DEPT_CHANGE          — changes the employee's main department
        JOB_CHANGE                — changes the employee's job
        RESPONSIBILITY_DEPTS_CHANGE — replaces the full set of responsibility departments
        STATUS_CHANGE             — changes the employee's status
    """

    __tablename__ = "employee_event_direction_types"

    code: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(128), nullable=False)

    type_directions: Mapped[list["EmployeeEventTypeDirection"]] = relationship(
        back_populates="direction_type",
        lazy="selectin",
    )
    event_changes: Mapped[list["EmployeeEventChange"]] = relationship(
        back_populates="direction_type",
        lazy="selectin",
    )

    def __repr__(self) -> str:
        return f"<EmployeeEventDirectionType(id={self.id}, code='{self.code}')>"

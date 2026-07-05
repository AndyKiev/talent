from __future__ import annotations

from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import ForeignKey, UniqueConstraint
from typing import TYPE_CHECKING

from backend.api_v1.base.base_model import Base
from backend.api_v1.base.models import IntIdPkMixin


if TYPE_CHECKING:
    from backend.api_v1.employee_events.employee_event_change.employee_event_change_model import (
        EmployeeEventChange,
    )
    from backend.api_v1.department.department_model import Department


class EmployeeEventChangeDepartment(IntIdPkMixin, Base):
    """
    One responsibility-department entry within an EmployeeEventChange row
    (direction type RESPONSIBILITY_DEPTS_CHANGE — the only direction that
    carries child department rows; MAIN_DEPT_CHANGE stores its department in
    the scalar new_department_id on the change row itself).

    Uniqueness: the same department cannot appear twice in the same change row.
    """

    __tablename__ = "employee_event_change_departments"
    __table_args__ = (
        UniqueConstraint(
            "event_change_id",
            "department_id",
            name="uq_event_change_department",
        ),
    )

    event_change_id: Mapped[int] = mapped_column(
        ForeignKey("employee_event_changes.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    department_id: Mapped[int] = mapped_column(
        ForeignKey("departments.id", ondelete="RESTRICT"),
        nullable=False,
    )

    event_change: Mapped["EmployeeEventChange"] = relationship(
        back_populates="dept_changes",
        lazy="selectin",
    )
    department: Mapped["Department"] = relationship(
        lazy="selectin",
    )

    def __repr__(self) -> str:
        return (
            f"<EmployeeEventChangeDepartment("
            f"id={self.id}, "
            f"event_change_id={self.event_change_id}, "
            f"department_id={self.department_id}"
            f")>"
        )

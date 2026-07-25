from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.api_v1.base.base_model import Base
from backend.api_v1.base.models import IntIdPkMixin

if TYPE_CHECKING:
    from backend.api_v1.department_type.department_type_model import DepartmentType
    from backend.api_v1.employee_events.employee_event_change.employee_event_change_model import (
        EmployeeEventChange,
    )


class EmployeeEventChangeDepartment(IntIdPkMixin, Base):
    """
    One responsibility department-TYPE entry within an EmployeeEventChange row
    (direction type RESPONSIBILITY_DEPTS_CHANGE — the only direction that
    carries child type rows; MAIN_DEPT_CHANGE stores its department INSTANCE in
    the scalar new_department_id on the change row itself).

    Responsibility is keyed on department TYPE, not instance (see
    EmployeeResponsibilityDepartment). Uniqueness: the same type cannot appear
    twice in the same change row.
    """

    __tablename__ = "employee_event_change_departments"
    __table_args__ = (
        UniqueConstraint(
            "event_change_id",
            "department_type_id",
            name="uq_event_change_department",
        ),
    )

    event_change_id: Mapped[int] = mapped_column(
        ForeignKey("employee_event_changes.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    department_type_id: Mapped[int] = mapped_column(
        ForeignKey("department_types.id", ondelete="RESTRICT"),
        nullable=False,
    )

    event_change: Mapped[EmployeeEventChange] = relationship(
        back_populates="dept_changes",
        lazy="selectin",
    )
    department_type: Mapped[DepartmentType] = relationship(
        lazy="selectin",
    )

    def __repr__(self) -> str:
        return (
            f"<EmployeeEventChangeDepartment("
            f"id={self.id}, "
            f"event_change_id={self.event_change_id}, "
            f"department_type_id={self.department_type_id}"
            f")>"
        )

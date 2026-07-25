from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.api_v1.base.base_model import Base
from backend.api_v1.base.models import IntIdPkMixin, TimestampMixin

if TYPE_CHECKING:
    from backend.api_v1.department.department_model import Department
    from backend.api_v1.employee.employee_model import Employee


class EmployeeDepartment(IntIdPkMixin, TimestampMixin, Base):
    """
    The employee's single MAIN (working) department.

    Uniqueness: at most ONE row per employee — enforced at both the DB level
    (UniqueConstraint on employee_id) and the service layer.

    Departments of responsibility live in the separate
    EmployeeResponsibilityDepartment table.
    """

    __table_args__ = (
        UniqueConstraint(
            "employee_id",
            name="uq_employee_department",
        ),
    )

    employee_id: Mapped[int] = mapped_column(
        ForeignKey("employees.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    department_id: Mapped[int] = mapped_column(
        ForeignKey("departments.id", ondelete="RESTRICT"),
        nullable=False,
    )

    # ── Relationships ──────────────────────────────────────────────────────
    employee: Mapped[Employee] = relationship(
        back_populates="departments",
        lazy="selectin",
    )
    department: Mapped[Department] = relationship(
        lazy="selectin",
    )

    def __repr__(self) -> str:
        return (
            f"<EmployeeDepartment("
            f"id={self.id}, "
            f"employee_id={self.employee_id}, "
            f"department_id={self.department_id}"
            f")>"
        )

from __future__ import annotations

from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import ForeignKey, UniqueConstraint, Boolean
from typing import TYPE_CHECKING

from backend.api_v1.base.base_model import Base
from backend.api_v1.base.models import IntIdPkMixin, TimestampMixin

if TYPE_CHECKING:
    from backend.api_v1.employee.employee_model import Employee
    from backend.api_v1.department.department_model import Department


class EmployeeDepartment(IntIdPkMixin, TimestampMixin, Base):
    """
    Junction record that places an employee in a specific
    (department) combination.

    Uniqueness: one employee cannot hold the same (department_id)
    pair more than once — enforced at both the DB level (UniqueConstraint)
    and the service layer.

    One employee can have at most one main department (is_main=True).
    """

    __table_args__ = (
        UniqueConstraint(
            "employee_id",
            "department_id",
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
    is_main: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
    )

    # ── Relationships ──────────────────────────────────────────────────────
    employee: Mapped["Employee"] = relationship(
        back_populates="departments",
        lazy="selectin",
    )
    department: Mapped["Department"] = relationship(
        lazy="selectin",
    )

    def __repr__(self) -> str:
        return (
            f"<EmployeeOrgUnitDepartment("
            f"id={self.id}, "
            f"employee_id={self.employee_id}, "
            f"department_id={self.department_id}, "
            f"is_main={self.is_main}"
            f")>"
        )

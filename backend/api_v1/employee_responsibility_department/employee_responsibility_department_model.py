from __future__ import annotations

from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import ForeignKey, UniqueConstraint
from typing import TYPE_CHECKING

from backend.api_v1.base.base_model import Base
from backend.api_v1.base.models import IntIdPkMixin, TimestampMixin

if TYPE_CHECKING:
    from backend.api_v1.department.department_model import Department


class EmployeeResponsibilityDepartment(IntIdPkMixin, TimestampMixin, Base):
    """
    Junction record: a department in the employee's RESPONSIBILITY area.

    Distinct from EmployeeDepartment, which holds the employee's single MAIN
    (working) department. An employee can have many responsibility departments,
    but the same department only once — enforced at both the DB level
    (UniqueConstraint) and the service layer.

    Projection of applied RESPONSIBILITY_DEPTS_CHANGE event rows (REPLACE
    semantics): the set always equals the latest applied event's selection.
    """

    __table_args__ = (
        UniqueConstraint(
            "employee_id",
            "department_id",
            name="uq_employee_responsibility_department",
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
    department: Mapped["Department"] = relationship(
        lazy="selectin",
    )

    def __repr__(self) -> str:
        return (
            f"<EmployeeResponsibilityDepartment("
            f"id={self.id}, "
            f"employee_id={self.employee_id}, "
            f"department_id={self.department_id}"
            f")>"
        )

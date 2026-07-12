from __future__ import annotations

from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import ForeignKey, UniqueConstraint
from typing import TYPE_CHECKING

from backend.api_v1.base.base_model import Base
from backend.api_v1.base.models import IntIdPkMixin, TimestampMixin

if TYPE_CHECKING:
    from backend.api_v1.department_type.department_type_model import DepartmentType


class EmployeeResponsibilityDepartment(IntIdPkMixin, TimestampMixin, Base):
    """
    Junction record: a department TYPE in the employee's RESPONSIBILITY area.

    Responsibility is expressed as a department TYPE (e.g. "ЛР та каси"), not a
    specific department instance — an employee is responsible for a KIND of
    unit within their main department, regardless of which concrete instance.

    Distinct from EmployeeDepartment, which holds the employee's single MAIN
    (working) department instance. An employee can have many responsibility
    types, but the same type only once — enforced at both the DB level
    (UniqueConstraint) and the service layer.

    Projection of applied RESPONSIBILITY_DEPTS_CHANGE event rows (REPLACE
    semantics): the set always equals the latest applied event's selection.
    """

    __table_args__ = (
        UniqueConstraint(
            "employee_id",
            "department_type_id",
            name="uq_employee_responsibility_department",
        ),
    )

    employee_id: Mapped[int] = mapped_column(
        ForeignKey("employees.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    department_type_id: Mapped[int] = mapped_column(
        ForeignKey("department_types.id", ondelete="RESTRICT"),
        nullable=False,
    )

    # ── Relationships ──────────────────────────────────────────────────────
    department_type: Mapped["DepartmentType"] = relationship(
        lazy="selectin",
    )

    def __repr__(self) -> str:
        return (
            f"<EmployeeResponsibilityDepartment("
            f"id={self.id}, "
            f"employee_id={self.employee_id}, "
            f"department_type_id={self.department_type_id}"
            f")>"
        )

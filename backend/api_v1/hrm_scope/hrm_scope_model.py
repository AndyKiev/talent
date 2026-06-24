from __future__ import annotations

from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import ForeignKey, Date, Index
from datetime import date
from typing import TYPE_CHECKING

from backend.api_v1.base.base_model import Base
from backend.api_v1.base.models import IntIdPkMixin, TimestampMixin

if TYPE_CHECKING:
    from backend.api_v1.employee.employee_model import Employee
    from backend.api_v1.department.department_model import Department
    from backend.api_v1.table_relationship_links.employee_user_group_link_model import (
        EmployeeUserGroupLink,
    )


class HrmScope(IntIdPkMixin, TimestampMixin, Base):
    """
    Talent-supervision scope for an HRM (human resource manager).

    Each row grants one HRM the right to view/process talent data for employees
    whose MAIN department is the linked department itself or a descendant of it,
    but only while today's date falls within [start_date, end_date] (inclusive).

    Ownership / lifecycle
    ---------------------
    A scope only has meaning while the HRM actually holds the HRM authorisation
    group. That membership is the row in ``employee_user_group_links``. The scope
    therefore hangs off that link row via ``employee_user_group_link_id`` with
    ``ondelete="CASCADE"``: removing the HRM group from an employee deletes all
    their scopes at the database level -- no orphans are possible, even from raw
    SQL. We keep no scope history, so cascade-delete is the intended behaviour.

    ``employee_id`` is denormalised (kept in sync with the link's employee) purely
    to keep grid/scope queries simple; the link FK is the authority for lifecycle.

    Distinct from EmployeeDepartment (is_main=False) "departments of
    responsibility": that models where an employee *works*; this models which
    departments an HRM may *supervise*. Overlapping date windows for the same
    (link, department) pair are intentionally allowed -- no uniqueness constraint.
    """

    __tablename__ = "hrm_scopes"

    __table_args__ = (
        Index("ix_hrm_scopes_link_id", "employee_user_group_link_id"),
        Index("ix_hrm_scopes_employee_id", "employee_id"),
        Index("ix_hrm_scopes_department_id", "department_id"),
        Index("ix_hrm_scopes_window", "start_date", "end_date"),
    )

    # Authority for lifecycle: the HRM-group membership this scope belongs to.
    employee_user_group_link_id: Mapped[int] = mapped_column(
        ForeignKey("employee_user_group_links.id", ondelete="CASCADE"),
        nullable=False,
    )
    # Denormalised convenience copy of the link's employee (the HRM).
    employee_id: Mapped[int] = mapped_column(
        ForeignKey("employees.id", ondelete="RESTRICT"),
        nullable=False,
    )
    # A 'store' or 'directorate' department instance (ancestor-or-self match).
    department_id: Mapped[int] = mapped_column(
        ForeignKey("departments.id", ondelete="RESTRICT"),
        nullable=False,
    )
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date] = mapped_column(Date, nullable=False)

    # -- Relationships --------------------------------------------------------
    employee_user_group_link: Mapped["EmployeeUserGroupLink"] = relationship(
        lazy="selectin",
    )
    employee: Mapped["Employee"] = relationship(lazy="selectin")
    department: Mapped["Department"] = relationship(lazy="selectin")

    def __repr__(self) -> str:
        return (
            f"<HrmScope(id={self.id}, "
            f"link_id={self.employee_user_group_link_id}, "
            f"employee_id={self.employee_id}, "
            f"department_id={self.department_id}, "
            f"start_date={self.start_date}, end_date={self.end_date})>"
        )

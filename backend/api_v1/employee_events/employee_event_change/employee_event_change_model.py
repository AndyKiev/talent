from __future__ import annotations

from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import ForeignKey
from typing import TYPE_CHECKING, Optional

from backend.api_v1.base.base_model import Base
from backend.api_v1.base.models import IntIdPkMixin


if TYPE_CHECKING:
    from backend.api_v1.employee_events.employee_event.employee_event_model import EmployeeEvent
    from backend.api_v1.employee_events.employee_event_direction_type.employee_event_direction_type_model import (
        EmployeeEventDirectionType,
    )
    from backend.api_v1.employee_events.employee_event_change_department.employee_event_change_department_model import (
        EmployeeEventChangeDepartment,
    )
    from backend.api_v1.job.job_model import Job
    from backend.api_v1.employee_status.employee_status_model import EmployeeStatus
    from backend.api_v1.department.department_model import Department


class EmployeeEventChange(IntIdPkMixin, Base):
    """
    One direction-change row within a parent event. Each row records
    what changed for a single direction type (job, status, main department,
    or responsibility departments).

    Scalar FKs (job, status, main department) are stored as nullable
    prev/new pairs directly on this row.

    The multi-valued responsibility-departments case is stored in the
    child `EmployeeEventChangeDepartment` rows via the `dept_changes`
    relationship — that table uses its own `change_dept_type_id` to
    distinguish MAIN_DEPT rows from RESPONSIBILITY_DEPT rows.

    Only the columns relevant to the active `direction_type` will be
    populated; the rest remain NULL. Application code switches on
    `direction_type.code` to know which columns to read.
    """

    __tablename__ = "employee_event_changes"

    event_id: Mapped[int] = mapped_column(
        ForeignKey("employee_events.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    direction_type_id: Mapped[int] = mapped_column(
        ForeignKey("employee_event_direction_types.id", ondelete="RESTRICT"),
        nullable=False,
    )

    # JOB_CHANGE
    prev_job_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("jobs.id", ondelete="SET NULL"), nullable=True
    )
    new_job_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("jobs.id", ondelete="SET NULL"), nullable=True
    )

    # STATUS_CHANGE
    prev_status_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("employee_statuses.id", ondelete="SET NULL"), nullable=True
    )
    new_status_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("employee_statuses.id", ondelete="SET NULL"), nullable=True
    )

    # MAIN_DEPT_CHANGE  (top-level department, one scalar value)
    prev_department_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("departments.id", ondelete="SET NULL"), nullable=True
    )
    new_department_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("departments.id", ondelete="SET NULL"), nullable=True
    )

    # ── Relationships ──────────────────────────────────────────────────────────

    event: Mapped["EmployeeEvent"] = relationship(
        back_populates="changes",
        lazy="selectin",
    )
    direction_type: Mapped["EmployeeEventDirectionType"] = relationship(
        back_populates="event_changes",
        lazy="selectin",
    )

    prev_job: Mapped[Optional["Job"]] = relationship(
        foreign_keys=[prev_job_id], lazy="selectin"
    )
    new_job: Mapped[Optional["Job"]] = relationship(
        foreign_keys=[new_job_id], lazy="selectin"
    )

    prev_status: Mapped[Optional["EmployeeStatus"]] = relationship(
        foreign_keys=[prev_status_id], lazy="selectin"
    )
    new_status: Mapped[Optional["EmployeeStatus"]] = relationship(
        foreign_keys=[new_status_id], lazy="selectin"
    )

    prev_department: Mapped[Optional["Department"]] = relationship(
        foreign_keys=[prev_department_id], lazy="selectin"
    )
    new_department: Mapped[Optional["Department"]] = relationship(
        foreign_keys=[new_department_id], lazy="selectin"
    )

    # RESPONSIBILITY_DEPTS_CHANGE  (multi-valued — child rows)
    dept_changes: Mapped[list["EmployeeEventChangeDepartment"]] = relationship(
        back_populates="event_change",
        lazy="selectin",
        cascade="all, delete-orphan",
    )

    def __repr__(self) -> str:
        return (
            f"<EmployeeEventChange("
            f"id={self.id}, "
            f"event_id={self.event_id}, "
            f"direction_type_id={self.direction_type_id}"
            f")>"
        )

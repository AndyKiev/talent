from datetime import datetime, date
from typing import TYPE_CHECKING, Optional

from sqlalchemy import Date, DateTime, ForeignKey, Integer, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.api_v1.base.base_model import Base
from backend.api_v1.base.models.utils.mixins import IntIdPkMixin

if TYPE_CHECKING:
    from backend.api_v1.department.department_model import Department
    from backend.api_v1.employee.employee_model import Employee
    from backend.api_v1.job.job_model import Job
    from backend.api_v1.job_requirement_group.job_requirement_group_model import (
        JobRequirementGroup,
    )
    from backend.api_v1.recruitment_task_status.recruitment_task_status_model import (
        RecruitmentTaskStatus,
    )


class RecruitmentTask(IntIdPkMixin, Base):
    __tablename__ = "recruitment_tasks"

    # The job we search a person for — pickable regardless of its is_active.
    job_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("jobs.id", ondelete="RESTRICT"),
        nullable=False,
    )
    # Nullable at creation; required before the task may go in_process.
    requirement_group_id: Mapped[Optional[int]] = mapped_column(
        Integer,
        ForeignKey("job_requirement_groups.id", ondelete="RESTRICT"),
        nullable=True,
    )
    status_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("recruitment_task_statuses.id", ondelete="RESTRICT"),
        nullable=False,
    )
    # The exact (possibly deep) department this search is for. Its top-level org
    # unit (store / directorate / board) is derived in the service, not stored.
    department_id: Mapped[Optional[int]] = mapped_column(
        Integer,
        ForeignKey("departments.id", ondelete="RESTRICT"),
        nullable=True,
    )
    comment: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    target_deadline: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    created_by: Mapped[int] = mapped_column(
        Integer, ForeignKey("employees.id", ondelete="RESTRICT"), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    # Transition stamps set by the state machine (service).
    in_process_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    closed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # Relationships
    job: Mapped["Job"] = relationship(lazy="selectin")
    department: Mapped[Optional["Department"]] = relationship(lazy="selectin")
    requirement_group: Mapped[Optional["JobRequirementGroup"]] = relationship(
        lazy="selectin",
    )
    status: Mapped["RecruitmentTaskStatus"] = relationship(
        back_populates="recruitment_tasks",
        lazy="selectin",
    )
    creator: Mapped["Employee"] = relationship(
        foreign_keys=[created_by],
        lazy="selectin",
    )

    def __repr__(self) -> str:
        return (
            f"<RecruitmentTask(id={self.id}, job_id={self.job_id}, "
            f"status_id={self.status_id})>"
        )

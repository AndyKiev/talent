from datetime import date, datetime
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
    job_requirement_group_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("job_requirement_groups.id", ondelete="RESTRICT"),
        nullable=True,
    )
    status_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("recruitment_task_statuses.id", ondelete="RESTRICT"),
        nullable=False,
    )
    # How many people this vacancy is for (default 1). Caps how many candidates
    # may sit in offer + hired at once (enforced by the pipeline service).
    openings: Mapped[int] = mapped_column(
        Integer, nullable=False, default=1, server_default="1"
    )
    # The exact (possibly deep) department this search is for. Its top-level org
    # unit (store / directorate / board) is derived in the service, not stored.
    department_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("departments.id", ondelete="RESTRICT"),
        nullable=True,
    )
    comment: Mapped[str | None] = mapped_column(Text, nullable=True)
    target_deadline: Mapped[date | None] = mapped_column(Date, nullable=True)
    created_by: Mapped[int] = mapped_column(
        Integer, ForeignKey("employees.id", ondelete="RESTRICT"), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    # Transition stamps set by the state machine (service).
    in_process_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    closed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # Relationships
    # Only `status` stays eager (a tiny lookup the state machine reads on every
    # transition). job / department / requirement_group / creator are NOLOAD —
    # eagerly loading them drags huge graphs (Job pulls its link graphs incl.
    # process roles, Department recurses its subtree, Employee pulls events/
    # person/departments, the group pulls items + creator). The service
    # enriches the slim minis via cheap column queries instead.
    job: Mapped["Job"] = relationship(lazy="noload")
    department: Mapped[Optional["Department"]] = relationship(lazy="noload")
    requirement_group: Mapped[Optional["JobRequirementGroup"]] = relationship(
        lazy="noload",
    )
    status: Mapped["RecruitmentTaskStatus"] = relationship(
        back_populates="recruitment_tasks",
        lazy="selectin",
    )
    creator: Mapped["Employee"] = relationship(
        foreign_keys=[created_by],
        lazy="noload",
    )

    def __repr__(self) -> str:
        return (
            f"<RecruitmentTask(id={self.id}, job_id={self.job_id}, "
            f"status_id={self.status_id})>"
        )

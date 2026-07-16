from datetime import datetime
from typing import TYPE_CHECKING, List

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.api_v1.base.base_model import Base
from backend.api_v1.base.models.utils.mixins import IntIdPkMixin

if TYPE_CHECKING:
    from backend.api_v1.employee.employee_model import Employee
    from backend.api_v1.job.job_model import Job
    from backend.api_v1.job_requirement_item.job_requirement_item_model import (
        JobRequirementItem,
    )


class JobRequirementGroup(IntIdPkMixin, Base):
    __tablename__ = "job_requirement_groups"

    job_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("jobs.id", ondelete="CASCADE"),
        nullable=False,
    )
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    # Only ONE group may be active per job — enforced by the service
    # (activating a group deactivates its siblings in the same job).
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_by: Mapped[int] = mapped_column(
        Integer, ForeignKey("employees.id", ondelete="RESTRICT"), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    # Relationships
    # NOLOAD: the API never exposes the job object (job_id is enough), and an
    # eager Job load drags its link graphs (process roles, trainings, groups).
    job: Mapped["Job"] = relationship(lazy="noload")
    # NOLOAD: creator isn't exposed by the API, and a full Employee eager-load
    # drags its whole selectin graph (events, departments, person, …).
    creator: Mapped["Employee"] = relationship(
        foreign_keys=[created_by],
        lazy="noload",
    )
    items: Mapped[List["JobRequirementItem"]] = relationship(
        back_populates="group",
        lazy="selectin",
        cascade="all, delete-orphan",
    )

    def __repr__(self) -> str:
        return (
            f"<JobRequirementGroup(id={self.id}, job_id={self.job_id}, "
            f"name='{self.name}', is_active={self.is_active})>"
        )

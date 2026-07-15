from datetime import datetime
from typing import TYPE_CHECKING, List

from sqlalchemy import (
    DateTime,
    ForeignKey,
    Integer,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.api_v1.base.base_model import Base
from backend.api_v1.base.models.utils.mixins import IntIdPkMixin

if TYPE_CHECKING:
    from backend.api_v1.candidate.candidate_model import Candidate
    from backend.api_v1.employee.employee_model import Employee
    from backend.api_v1.recruitment_task.recruitment_task_model import RecruitmentTask
    from backend.api_v1.pipeline_status.pipeline_status_model import PipelineStatus
    from backend.api_v1.application_status_history.application_status_history_model import (
        ApplicationStatusHistory,
    )


class CandidateApplication(IntIdPkMixin, Base):
    """A candidate's participation in one recruitment task's pipeline.

    Status is per-application, so a candidate considered for several tasks sits
    at an independent stage in each.
    """

    __tablename__ = "candidate_applications"
    __table_args__ = (
        UniqueConstraint(
            "candidate_id",
            "recruitment_task_id",
            name="uq_candidate_application_candidate_task",
        ),
    )

    candidate_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("candidates.id", ondelete="CASCADE"), nullable=False
    )
    recruitment_task_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("recruitment_tasks.id", ondelete="RESTRICT"), nullable=False
    )
    status_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("pipeline_statuses.id", ondelete="RESTRICT"), nullable=False
    )
    created_by: Mapped[int] = mapped_column(
        Integer, ForeignKey("employees.id", ondelete="RESTRICT"), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    # Relationships
    candidate: Mapped["Candidate"] = relationship(
        back_populates="applications", lazy="selectin"
    )
    recruitment_task: Mapped["RecruitmentTask"] = relationship(lazy="selectin")
    status: Mapped["PipelineStatus"] = relationship(
        back_populates="applications", lazy="selectin"
    )
    creator: Mapped["Employee"] = relationship(
        foreign_keys=[created_by], lazy="selectin"
    )
    status_history: Mapped[List["ApplicationStatusHistory"]] = relationship(
        back_populates="application",
        lazy="selectin",
        cascade="all, delete-orphan",
        order_by="ApplicationStatusHistory.changed_at",
    )

    def __repr__(self) -> str:
        return (
            f"<CandidateApplication(id={self.id}, candidate_id={self.candidate_id}, "
            f"recruitment_task_id={self.recruitment_task_id}, status_id={self.status_id})>"
        )

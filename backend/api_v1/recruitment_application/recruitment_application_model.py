from datetime import datetime
from typing import TYPE_CHECKING

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
    from backend.api_v1.recruitment_application_status_change.recruitment_application_status_change_model import (
        RecruitmentApplicationStatusChange,
    )
    from backend.api_v1.recruitment_candidate.recruitment_candidate_model import (
        RecruitmentCandidate,
    )
    from backend.api_v1.recruitment_application_status.recruitment_application_status_model import (
        RecruitmentApplicationStatus,
    )
    from backend.api_v1.recruitment_task.recruitment_task_model import RecruitmentTask


class RecruitmentApplication(IntIdPkMixin, Base):
    """A candidate's participation in one recruitment task's pipeline.

    Status is per-application, so a candidate considered for several tasks sits
    at an independent stage in each.
    """

    __tablename__ = "recruitment_applications"
    __table_args__ = (
        UniqueConstraint(
            "candidate_id",
            "recruitment_task_id",
            name="uq_recruitment_application_candidate_task",
        ),
    )

    candidate_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("recruitment_candidates.id", ondelete="CASCADE"),
        nullable=False,
    )
    recruitment_task_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("recruitment_tasks.id", ondelete="RESTRICT"), nullable=False
    )
    status_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("recruitment_application_statuses.id", ondelete="RESTRICT"),
        nullable=False,
    )
    created_by: Mapped[int] = mapped_column(
        Integer, ForeignKey("employees.id", ondelete="RESTRICT"), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    # Relationships
    # candidate / recruitment_task are NOLOAD on purpose: eagerly loading them
    # drags huge object graphs (candidate → its whole tree; task → job/creator/
    # department …). The service enriches the slim minis the API exposes via
    # cheap column queries instead. `status` and `status_history` stay eager —
    # they are tiny lookups the pipeline logic reads on every move.
    candidate: Mapped["RecruitmentCandidate"] = relationship(
        back_populates="applications", lazy="noload"
    )
    recruitment_task: Mapped["RecruitmentTask"] = relationship(lazy="noload")
    status: Mapped["RecruitmentApplicationStatus"] = relationship(
        back_populates="applications", lazy="selectin"
    )
    status_history: Mapped[list["RecruitmentApplicationStatusChange"]] = relationship(
        back_populates="application",
        lazy="selectin",
        cascade="all, delete-orphan",
        order_by="RecruitmentApplicationStatusChange.created_at",
    )

    def __repr__(self) -> str:
        return (
            f"<RecruitmentApplication(id={self.id}, candidate_id={self.candidate_id}, "
            f"recruitment_task_id={self.recruitment_task_id}, status_id={self.status_id})>"
        )

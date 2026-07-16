from datetime import datetime
from typing import TYPE_CHECKING, List

from sqlalchemy import DateTime, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.api_v1.base.base_model import Base
from backend.api_v1.base.models.utils.mixins import IntIdPkMixin

if TYPE_CHECKING:
    from backend.api_v1.candidate_application.candidate_application_model import (
        CandidateApplication,
    )
    from backend.api_v1.interview_interviewer.interview_interviewer_model import (
        InterviewInterviewer,
    )
    from backend.api_v1.interview_feedback.interview_feedback_model import (
        InterviewFeedback,
    )


class Interview(IntIdPkMixin, Base):
    """A scheduled interview for one candidate application (where + when +
    up to three interviewers). Moving an application to the `interview` stage
    requires one; creating one auto-advances the application."""

    __tablename__ = "interviews"

    application_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("candidate_applications.id", ondelete="CASCADE"),
        nullable=False,
    )
    scheduled_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    location: Mapped[str] = mapped_column(String(256), nullable=False)
    created_by: Mapped[int] = mapped_column(
        Integer, ForeignKey("employees.id", ondelete="RESTRICT"), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    # NOLOAD application — the service enriches candidate/job minis via column
    # queries (see /noload-plus-mini-enrichment). Link + feedback rows are tiny
    # and stay eager; their employee sides are themselves noload.
    application: Mapped["CandidateApplication"] = relationship(lazy="noload")
    interviewers: Mapped[List["InterviewInterviewer"]] = relationship(
        back_populates="interview",
        lazy="selectin",
        cascade="all, delete-orphan",
    )
    feedbacks: Mapped[List["InterviewFeedback"]] = relationship(
        back_populates="interview",
        lazy="selectin",
        cascade="all, delete-orphan",
        order_by="InterviewFeedback.created_at",
    )

    def __repr__(self) -> str:
        return f"<Interview(id={self.id}, application_id={self.application_id})>"

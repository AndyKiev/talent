from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.api_v1.base.base_model import Base
from backend.api_v1.base.models.utils.mixins import IntIdPkMixin

if TYPE_CHECKING:
    from backend.api_v1.recruitment_application.recruitment_application_model import (
        RecruitmentApplication,
    )
    from backend.api_v1.recruitment_interview_feedback.recruitment_interview_feedback_model import (
        RecruitmentInterviewFeedback,
    )
    from backend.api_v1.recruitment_interview_interviewer.recruitment_interview_interviewer_model import (
        RecruitmentInterviewInterviewer,
    )


class RecruitmentInterview(IntIdPkMixin, Base):
    """A scheduled interview for one candidate application (where + when +
    up to three interviewers). Moving an application to the `interview` stage
    requires one; creating one auto-advances the application."""

    __tablename__ = "recruitment_interviews"

    application_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("recruitment_applications.id", ondelete="CASCADE"),
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
    application: Mapped["RecruitmentApplication"] = relationship(lazy="noload")
    interviewers: Mapped[list["RecruitmentInterviewInterviewer"]] = relationship(
        back_populates="interview",
        lazy="selectin",
        cascade="all, delete-orphan",
    )
    feedbacks: Mapped[list["RecruitmentInterviewFeedback"]] = relationship(
        back_populates="interview",
        lazy="selectin",
        cascade="all, delete-orphan",
        order_by="RecruitmentInterviewFeedback.created_at",
    )

    def __repr__(self) -> str:
        return f"<RecruitmentInterview(id={self.id}, application_id={self.application_id})>"

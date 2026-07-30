from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.api_v1.base.base_model import Base
from backend.api_v1.base.models.utils.mixins import IntIdPkMixin

if TYPE_CHECKING:
    from backend.api_v1.employee.employee_model import Employee
    from backend.api_v1.recruitment_interview.recruitment_interview_model import (
        RecruitmentInterview,
    )


class RecruitmentInterviewFeedback(IntIdPkMixin, Base):
    """Feedback on a candidate written for one interview — by an interviewer or
    directly by HR. Surfaces on the candidate's Feedback tab."""

    __tablename__ = "recruitment_interview_feedbacks"

    interview_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("recruitment_interviews.id", ondelete="CASCADE"),
        nullable=False,
    )
    created_by: Mapped[int] = mapped_column(
        Integer, ForeignKey("employees.id", ondelete="RESTRICT"), nullable=False
    )
    body: Mapped[str] = mapped_column(Text, nullable=False)
    # 'hire' | 'no_hire' | 'maybe' — optional recommendation.
    recommendation: Mapped[str | None] = mapped_column(String(16), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    interview: Mapped["RecruitmentInterview"] = relationship(back_populates="feedbacks")
    # NOLOAD: the service enriches the creator mini via a column query.
    creator: Mapped["Employee"] = relationship(lazy="noload")

    def __repr__(self) -> str:
        return f"<RecruitmentInterviewFeedback(id={self.id}, interview_id={self.interview_id})>"

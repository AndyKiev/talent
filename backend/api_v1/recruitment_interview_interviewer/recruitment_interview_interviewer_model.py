from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, Integer, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.api_v1.base.base_model import Base
from backend.api_v1.base.models.utils.mixins import IntIdPkMixin

if TYPE_CHECKING:
    from backend.api_v1.employee.employee_model import Employee
    from backend.api_v1.recruitment_interview.recruitment_interview_model import (
        RecruitmentInterview,
    )


class RecruitmentInterviewInterviewer(IntIdPkMixin, Base):
    """One interviewer of an interview (≤3 per interview, service-enforced).

    Only employees holding a `manager`-category job may be assigned; assigning
    also adds the employee to the `Interviewer` access group. Managed inline
    through the interview payload — no standalone router.
    """

    __tablename__ = "recruitment_interview_interviewers"
    __table_args__ = (
        UniqueConstraint(
            "interview_id", "employee_id", name="uq_recruitment_interview_interviewer"
        ),
    )

    interview_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("recruitment_interviews.id", ondelete="CASCADE"),
        nullable=False,
    )
    employee_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("employees.id", ondelete="RESTRICT"), nullable=False
    )

    interview: Mapped["RecruitmentInterview"] = relationship(
        back_populates="interviewers"
    )
    # NOLOAD: the service enriches the employee mini via a column query.
    employee: Mapped["Employee"] = relationship(lazy="noload")

    def __repr__(self) -> str:
        return (
            f"<RecruitmentInterviewInterviewer(interview_id={self.interview_id}, "
            f"employee_id={self.employee_id})>"
        )

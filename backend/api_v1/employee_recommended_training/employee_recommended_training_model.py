from typing import TYPE_CHECKING

from sqlalchemy import Boolean, ForeignKey, Integer, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.api_v1.base.base_model import Base
from backend.api_v1.base.models import IntIdPkMixin, TimestampMixin

if TYPE_CHECKING:
    from backend.api_v1.employee.employee_model import Employee
    from backend.api_v1.employee_recommended_training_status.employee_recommended_training_status_model import (
        EmployeeRecommendedTrainingStatus,
    )


class EmployeeRecommendedTraining(IntIdPkMixin, TimestampMixin, Base):
    """
    A training, course or internship recommended to an employee — free text, not
    a link to a `training_types` row.

    Replaces a line of the former `review_session_employees.trainings` text
    column (one numbered blob per review). Two consequences of that move:

    - **It belongs to the EMPLOYEE, not the review.** The same reasoning as the
      development missions: advice about someone's development outlives the
      session that raised it. Re-exporting a TEMPO album for an OLD session
      therefore shows the employee's CURRENT recommendations, not a snapshot.
      It also means the list has one home in the employee card and one in the
      people review, both reading these same rows.
    - **It is free TEXT on purpose.** Linking to `training_types` would tie it to
      the training module, but the recommendations must stay visible and
      editable with that module switched off — so there is no FK to it, and its
      status lookup is separate too.

    `is_active` is the "still relevant" flag, defaulting to true. Lists show only
    active rows unless the reader asks for everything; nothing is deleted just
    because it went stale, so history survives. Both the employee and their
    oversight manager may toggle it.
    """

    __tablename__ = "employee_recommended_trainings"

    employee_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("employees.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    employee_recommended_training_status_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("employee_recommended_training_statuses.id"),
        nullable=False,
    )
    description: Mapped[str] = mapped_column(Text, nullable=False)
    is_active: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default="true", default=True
    )
    # Display order within the employee's list (0, 1, 2 …).
    sort_order: Mapped[int] = mapped_column(
        Integer, nullable=False, server_default="0", default=0
    )

    employee: Mapped["Employee"] = relationship(lazy="noload")
    status: Mapped["EmployeeRecommendedTrainingStatus"] = relationship(
        back_populates="recommended_trainings",
        lazy="selectin",
    )

    def __repr__(self) -> str:
        return (
            f"<EmployeeRecommendedTraining(id={self.id}, "
            f"employee_id={self.employee_id}, is_active={self.is_active})>"
        )

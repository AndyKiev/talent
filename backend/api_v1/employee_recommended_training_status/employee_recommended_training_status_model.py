from typing import TYPE_CHECKING

from sqlalchemy import Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.api_v1.base.base_model import Base
from backend.api_v1.base.models import IntIdPkMixin, TimestampMixin

if TYPE_CHECKING:
    from backend.api_v1.employee_recommended_training.employee_recommended_training_model import (
        EmployeeRecommendedTraining,
    )

# RECOMMENDED is the DEFAULT applied to every new recommendation, and is
# resolved BY KEY (never by id, so it survives a reseed). The rest are the
# progression an employee or their oversight manager can move it through.
RECOMMENDED = "recommended"
PLANNED = "planned"
IN_PROCESS = "in_process"
PASSED = "passed"


class EmployeeRecommendedTrainingStatus(IntIdPkMixin, TimestampMixin, Base):
    """
    Where a recommended training stands for the employee: recommended (the
    default), then planned / in_process / passed as they act on it.

    DELIBERATELY SEPARATE from `employee_training_statuses`, even though the
    progression looks similar. That table belongs to the training MODULE and
    drives assigned `employee_trainings`; sharing it would mean a 'recommended'
    row showing up in the module's own status picker, where it means nothing —
    and it would tie two lifecycles together that are free to diverge. The
    recommendations must keep working with the training module switched off,
    which is the whole point of them being their own essence.
    """

    __tablename__ = "employee_recommended_training_statuses"

    key: Mapped[str] = mapped_column(String(32), nullable=False, unique=True)
    description: Mapped[str] = mapped_column(
        String(256), nullable=False, server_default="", default=""
    )
    sort_order: Mapped[int] = mapped_column(
        Integer, nullable=False, server_default="0", default=0
    )

    recommended_trainings: Mapped[list["EmployeeRecommendedTraining"]] = relationship(
        back_populates="status",
        lazy="noload",
    )

    def __repr__(self) -> str:
        return f"<EmployeeRecommendedTrainingStatus(id={self.id}, key='{self.key}')>"

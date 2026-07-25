# backend/api_v1/employee_training/employee_training_model.py
from typing import TYPE_CHECKING

from backend.api_v1.base.base_model import Base
from backend.api_v1.base.models.utils.mixins import IntIdPkMixin, TimestampMixin
from sqlalchemy import ForeignKey, Integer, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

if TYPE_CHECKING:
    from backend.api_v1.employee.employee_model import Employee
    from backend.api_v1.employee_training_status.employee_training_status_model import (
        EmployeeTrainingStatus,
    )
    from backend.api_v1.training_type.training_type_model import TrainingType


class EmployeeTraining(IntIdPkMixin, TimestampMixin, Base):
    """
    An employee's assignment to a training type + its current status. Accepts
    ANY training_type_id regardless of eligibility rules — eligibility only
    filters the picker on the frontend (see TrainingTypeService.get_eligible_for_employee),
    it is never enforced here.
    """

    __tablename__ = "employee_trainings"
    __table_args__ = (
        UniqueConstraint("employee_id", "training_type_id", name="uq_employee_training"),
    )

    employee_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("employees.id", ondelete="CASCADE"), nullable=False
    )
    training_type_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("training_types.id", ondelete="RESTRICT"), nullable=False
    )
    training_status_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("employee_training_statuses.id", ondelete="RESTRICT"),
        nullable=False,
    )

    employee: Mapped["Employee"] = relationship(lazy="selectin")
    training_type: Mapped["TrainingType"] = relationship(
        back_populates="employee_trainings",
        lazy="selectin",
    )
    training_status: Mapped["EmployeeTrainingStatus"] = relationship(
        back_populates="employee_trainings",
        lazy="selectin",
    )

    def __repr__(self) -> str:
        return (
            f"<EmployeeTraining(id={self.id}, employee_id={self.employee_id}, "
            f"training_type_id={self.training_type_id})>"
        )

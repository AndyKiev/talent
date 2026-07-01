# backend/api_v1/employee_training_status/employee_training_status_model.py
from typing import TYPE_CHECKING
from sqlalchemy import String, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.api_v1.base.base_model import Base
from backend.api_v1.base.models.utils.mixins import IntIdPkMixin, TimestampMixin

if TYPE_CHECKING:
    from backend.api_v1.employee_training.employee_training_model import (
        EmployeeTraining,
    )


class EmployeeTrainingStatus(IntIdPkMixin, TimestampMixin, Base):
    """
    Status of an employee's OWN progress on an assigned training (e.g.
    planned, in_progress, passed) — distinct from a training program's own
    lifecycle status (e.g. being_prepared/ready), which is a separate concept.
    User-managed via the Training menu's Statuses tab — not seeded.
    """

    __tablename__ = "employee_training_statuses"

    key: Mapped[str] = mapped_column(String(32), nullable=False, unique=True)
    description: Mapped[str | None] = mapped_column(String(256), nullable=True)
    # Display order for the Statuses admin grid + the Training State tab (the
    # State tab prepends the synthetic not_planned, then lists these by
    # sort_order). Reordered via the shared arrow-reorder hook (per-row PATCH).
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    employee_trainings: Mapped[list["EmployeeTraining"]] = relationship(
        back_populates="training_status",
        lazy="selectin",
    )

    def __repr__(self) -> str:
        return f"<EmployeeTrainingStatus(id={self.id}, key='{self.key}')>"

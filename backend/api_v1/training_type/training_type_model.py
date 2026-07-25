# backend/api_v1/training_type/training_type_model.py
from typing import TYPE_CHECKING

from backend.api_v1.base.base_model import Base
from backend.api_v1.base.models.utils.mixins import IntIdPkMixin, TimestampMixin
from sqlalchemy import ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

if TYPE_CHECKING:
    from backend.api_v1.employee_training.employee_training_model import (
        EmployeeTraining,
    )
    from backend.api_v1.training_category.training_category_model import (
        TrainingCategory,
    )
    from backend.api_v1.training_link_type.training_link_type_model import (
        TrainingLinkType,
    )
    from backend.api_v1.training_type_job_category_link.training_type_job_category_link_model import (
        TrainingTypeJobCategoryLink,
    )
    from backend.api_v1.training_type_job_link.training_type_job_link_model import (
        TrainingTypeJobLink,
    )


class TrainingType(IntIdPkMixin, TimestampMixin, Base):
    """
    A trainable program (e.g. "Школа менеджерів"). Scoped to employees via
    training_link_type: everyone / by_job_category (any linked job_category)
    / by_job (any linked job, matched against an employee's current job OR
    their talent target jobs — see TrainingTypeService.get_eligible_for_employee).
    Multiple jobs / job categories can be linked (training_type_job_links,
    training_type_job_category_links); which link set applies is chosen by
    training_link_type, enforced in the service layer, not the DB.
    """

    __tablename__ = "training_types"

    name: Mapped[str] = mapped_column(String(128), nullable=False, unique=True)
    key: Mapped[str] = mapped_column(String(64), nullable=False, unique=True)
    description: Mapped[str | None] = mapped_column(String(256), nullable=True)

    training_category_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("training_categories.id", ondelete="RESTRICT"), nullable=False
    )
    training_link_type_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("training_link_types.id", ondelete="RESTRICT"), nullable=False
    )

    training_category: Mapped["TrainingCategory"] = relationship(
        back_populates="training_types",
        lazy="selectin",
    )
    training_link_type: Mapped["TrainingLinkType"] = relationship(
        back_populates="training_types",
        lazy="selectin",
    )

    job_links: Mapped[list["TrainingTypeJobLink"]] = relationship(
        back_populates="training_type",
        lazy="selectin",
        cascade="all, delete-orphan",
    )
    job_category_links: Mapped[list["TrainingTypeJobCategoryLink"]] = relationship(
        back_populates="training_type",
        lazy="selectin",
        cascade="all, delete-orphan",
    )

    employee_trainings: Mapped[list["EmployeeTraining"]] = relationship(
        back_populates="training_type",
        lazy="selectin",
    )

    def __repr__(self) -> str:
        return f"<TrainingType(id={self.id}, key='{self.key}')>"

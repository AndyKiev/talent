from typing import TYPE_CHECKING

from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.api_v1.base.base_model import Base
from backend.api_v1.base.models.utils.mixins import IntIdPkMixin

if TYPE_CHECKING:
    from backend.api_v1.recruitment_task.recruitment_task_model import RecruitmentTask


class RecruitmentTaskStatus(IntIdPkMixin, Base):
    __tablename__ = "recruitment_task_statuses"

    # Fixed set seeded by migration: created / in_process / fulfilled / rejected.
    # Transitions are enforced by recruitment_task_state_machine.py (by name).
    name: Mapped[str] = mapped_column(String(32), nullable=False, unique=True)
    description: Mapped[str | None] = mapped_column(String(128), nullable=True)

    # Relationships
    recruitment_tasks: Mapped[list["RecruitmentTask"]] = relationship(
        back_populates="status",
    )

    def __repr__(self) -> str:
        return f"<RecruitmentTaskStatus(id={self.id}, name='{self.name}')>"

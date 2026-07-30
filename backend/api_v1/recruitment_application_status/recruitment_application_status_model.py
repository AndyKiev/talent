from typing import TYPE_CHECKING

from sqlalchemy import Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.api_v1.base.base_model import Base
from backend.api_v1.base.models.utils.mixins import IntIdPkMixin

if TYPE_CHECKING:
    from backend.api_v1.recruitment_application.recruitment_application_model import (
        RecruitmentApplication,
    )


class RecruitmentApplicationStatus(IntIdPkMixin, Base):
    __tablename__ = "recruitment_application_statuses"

    # Fixed set seeded by migration: applied / screen / interview / offer /
    # hired / rejected. Transitions enforced by the pipeline state machine.
    name: Mapped[str] = mapped_column(String(32), nullable=False, unique=True)
    description: Mapped[str | None] = mapped_column(String(128), nullable=True)
    # Stage order (applied=0 … rejected=5); drives the kanban column order and
    # the "furthest stage" derivation on a candidate.
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    applications: Mapped[list["RecruitmentApplication"]] = relationship(
        back_populates="status",
    )

    def __repr__(self) -> str:
        return f"<RecruitmentApplicationStatus(id={self.id}, name='{self.name}')>"

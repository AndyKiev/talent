from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import String, Integer
from backend.api_v1.base.base_model import Base
from backend.api_v1.base.models.utils.mixins import IntIdPkMixin
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from backend.api_v1.candidate_application.candidate_application_model import (
        CandidateApplication,
    )


class PipelineStatus(IntIdPkMixin, Base):
    __tablename__ = "pipeline_statuses"

    # Fixed set seeded by migration: applied / screen / interview / offer /
    # hired / rejected. Transitions enforced by the pipeline state machine.
    name: Mapped[str] = mapped_column(String(32), nullable=False, unique=True)
    description: Mapped[str | None] = mapped_column(String(128), nullable=True)
    # Stage order (applied=0 … rejected=5); drives the kanban column order and
    # the "furthest stage" derivation on a candidate.
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    applications: Mapped[list["CandidateApplication"]] = relationship(
        back_populates="status",
    )

    def __repr__(self) -> str:
        return f"<PipelineStatus(id={self.id}, name='{self.name}')>"

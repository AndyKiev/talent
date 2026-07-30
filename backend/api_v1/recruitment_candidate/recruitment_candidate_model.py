from datetime import datetime
from typing import TYPE_CHECKING, Optional

from sqlalchemy import DateTime, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.api_v1.base.base_model import Base
from backend.api_v1.base.models.utils.mixins import IntIdPkMixin

if TYPE_CHECKING:
    from backend.api_v1.recruitment_application.recruitment_application_model import (
        RecruitmentApplication,
    )
    from backend.api_v1.recruitment_candidate_note.recruitment_candidate_note_model import (
        RecruitmentCandidateNote,
    )
    from backend.api_v1.recruitment_candidate_phone.recruitment_candidate_phone_model import (
        RecruitmentCandidatePhone,
    )
    from backend.api_v1.recruitment_candidate_source.recruitment_candidate_source_model import (
        RecruitmentCandidateSource,
    )


class RecruitmentCandidate(IntIdPkMixin, Base):
    __tablename__ = "recruitment_candidates"

    first_name: Mapped[str] = mapped_column(String(128), nullable=False)
    last_name: Mapped[str] = mapped_column(String(128), nullable=False)
    email: Mapped[str | None] = mapped_column(String(128), unique=True, nullable=True)
    # Where the candidate came from (optional — set on the create form).
    candidate_source_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("recruitment_candidate_sources.id", ondelete="RESTRICT"),
        nullable=True,
    )
    created_by: Mapped[int] = mapped_column(
        Integer, ForeignKey("employees.id", ondelete="RESTRICT"), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    # Relationships
    # NOTE: no `creator` relationship on purpose — eagerly loading an Employee
    # drags its whole selectin graph (events, departments, person, …) and made
    # the recruitment_candidates list take seconds. `created_by` (the id) is enough.
    source: Mapped[Optional["RecruitmentCandidateSource"]] = relationship(
        lazy="selectin"
    )
    phones: Mapped[list["RecruitmentCandidatePhone"]] = relationship(
        back_populates="candidate",
        lazy="selectin",
        cascade="all, delete-orphan",
        order_by="RecruitmentCandidatePhone.sort_order",
    )
    notes: Mapped[list["RecruitmentCandidateNote"]] = relationship(
        back_populates="candidate",
        lazy="selectin",
        cascade="all, delete-orphan",
        order_by="RecruitmentCandidateNote.created_at",
    )
    applications: Mapped[list["RecruitmentApplication"]] = relationship(
        back_populates="candidate",
        lazy="selectin",
        cascade="all, delete-orphan",
    )

    def __repr__(self) -> str:
        return (
            f"<RecruitmentCandidate(id={self.id}, "
            f"name='{self.first_name} {self.last_name}')>"
        )

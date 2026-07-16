from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Integer, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.api_v1.base.base_model import Base
from backend.api_v1.base.models.utils.mixins import IntIdPkMixin

if TYPE_CHECKING:
    from backend.api_v1.candidate.candidate_model import Candidate
    from backend.api_v1.employee.employee_model import Employee


class CandidateNote(IntIdPkMixin, Base):
    """A free-text note on a candidate's timeline, attributed to its author."""

    __tablename__ = "candidate_notes"

    candidate_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("candidates.id", ondelete="CASCADE"), nullable=False
    )
    author_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("employees.id", ondelete="RESTRICT"), nullable=False
    )
    body: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    candidate: Mapped["Candidate"] = relationship(back_populates="notes")
    # NOLOAD: the service fills the author mini (id/name/code) via a column
    # query — a full Employee eager-load drags its whole selectin graph.
    author: Mapped["Employee"] = relationship(foreign_keys=[author_id], lazy="noload")

    def __repr__(self) -> str:
        return f"<CandidateNote(id={self.id}, candidate_id={self.candidate_id})>"

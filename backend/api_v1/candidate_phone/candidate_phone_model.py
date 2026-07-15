from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.api_v1.base.base_model import Base
from backend.api_v1.base.models.utils.mixins import IntIdPkMixin

if TYPE_CHECKING:
    from backend.api_v1.candidate.candidate_model import Candidate


class CandidatePhone(IntIdPkMixin, Base):
    """One phone number of a candidate (a candidate may have several).

    Managed inline through the candidate create/update payload — no standalone
    router.
    """

    __tablename__ = "candidate_phones"

    candidate_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("candidates.id", ondelete="CASCADE"), nullable=False
    )
    phone: Mapped[str] = mapped_column(String(32), nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    candidate: Mapped["Candidate"] = relationship(back_populates="phones")

    def __repr__(self) -> str:
        return f"<CandidatePhone(id={self.id}, candidate_id={self.candidate_id})>"

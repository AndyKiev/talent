from typing import TYPE_CHECKING

from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.api_v1.base.base_model import Base
from backend.api_v1.base.models.utils.mixins import IntIdPkMixin

if TYPE_CHECKING:
    from backend.api_v1.talent_audit_interview.talent_audit_interview_model import (
        TalentAuditInterview,
    )


class TalentAuditInterviewStatus(IntIdPkMixin, Base):
    __tablename__ = "talent_audit_interview_statuses"

    name: Mapped[str] = mapped_column(String(32), nullable=False, unique=True)
    description: Mapped[str | None] = mapped_column(String(128), nullable=True)

    # Relationships
    talent_audit_interviews: Mapped[list["TalentAuditInterview"]] = relationship(
        back_populates="status",
        lazy="selectin",
    )

    def __repr__(self) -> str:
        return f"<TalentAuditInterviewStatus(id={self.id}, name='{self.name}')>"

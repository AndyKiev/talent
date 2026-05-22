from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import String
from backend.api_v1.base.base_model import Base
from backend.api_v1.base.models.utils.mixins import IntIdPkMixin
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from backend.api_v1.talent_audit.talent_audit_model import TalentAudit


class TalentAuditStatus(IntIdPkMixin, Base):
    __tablename__ = "talent_audit_statuses"

    name: Mapped[str] = mapped_column(String(32), nullable=False, unique=True)
    description: Mapped[str | None] = mapped_column(String(128), nullable=True)

    # Relationships
    talent_audits: Mapped[list["TalentAudit"]] = relationship(
        back_populates="status",
        lazy="selectin",
    )

    def __repr__(self) -> str:
        return f"<TalentAuditStatus(id={self.id}, name='{self.name}')>"

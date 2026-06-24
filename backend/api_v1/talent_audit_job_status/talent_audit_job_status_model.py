from typing import TYPE_CHECKING

from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.api_v1.base.base_model import Base
from backend.api_v1.base.models.utils.mixins import IntIdPkMixin

if TYPE_CHECKING:
    from backend.api_v1.talent_audit_job.talent_audit_job_model import TalentAuditJob


class TalentAuditJobStatus(IntIdPkMixin, Base):
    __tablename__ = "talent_audit_job_statuses"

    name: Mapped[str] = mapped_column(String(32), nullable=False, unique=True)
    key: Mapped[str] = mapped_column(String(32), nullable=False, unique=True)
    description: Mapped[str | None] = mapped_column(String(128), nullable=True)

    # Relationships
    talent_audit_jobs: Mapped[list["TalentAuditJob"]] = relationship(
        back_populates="status",
        lazy="selectin",
    )

    def __repr__(self) -> str:
        return f"<TalentAuditJobStatus(id={self.id}, key='{self.key}', name='{self.name}')>"

from typing import TYPE_CHECKING, Optional
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import ForeignKey, Boolean, UniqueConstraint, func
from sqlalchemy import DateTime
from backend.api_v1.base.base_model import Base
from backend.api_v1.base.models.utils.mixins import IntIdPkMixin
import datetime

if TYPE_CHECKING:
    from backend.api_v1.talent_status.talent_status_model import TalentStatus
    from backend.api_v1.talent_period.talent_period_model import TalentPeriod
    from backend.api_v1.talent_audit_job.talent_audit_job_model import TalentAuditJob


class TalentStatusPeriodLink(IntIdPkMixin, Base):
    __tablename__ = "talent_status_period_link"
    __table_args__ = (
        UniqueConstraint(
            "talent_period_id",
            "talent_status_id",
            name="idx_uq_talent_status_period",
        ),
    )

    talent_period_id: Mapped[int] = mapped_column(
        ForeignKey("talent_periods.id", ondelete="RESTRICT"),
        nullable=False,
    )
    talent_status_id: Mapped[int] = mapped_column(
        ForeignKey("talent_statuses.id", ondelete="RESTRICT"),
        nullable=False,
    )
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_by: Mapped[Optional[int]] = mapped_column(
        ForeignKey("employees.id", ondelete="SET NULL"),
        nullable=True,
    )
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    talent_period: Mapped["TalentPeriod"] = relationship(
        back_populates="_statuses",
        lazy="selectin",
    )
    talent_status: Mapped["TalentStatus"] = relationship(
        back_populates="_periods",
        lazy="selectin",
    )
    talent_audit_jobs: Mapped[list["TalentAuditJob"]] = relationship(
        back_populates="talent_status_period_link",
        lazy="noload",
    )

    def __repr__(self) -> str:
        return (
            f"<TalentStatusPeriodLink("
            f"id={self.id}, "
            f"talent_period_id={self.talent_period_id}, "
            f"talent_status_id={self.talent_status_id}"
            f")>"
        )

from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import Integer, ForeignKey, UniqueConstraint
from backend.api_v1.base.base_model import Base
from backend.api_v1.base.models.utils.mixins import IntIdPkMixin, TimestampMixin
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from backend.api_v1.job_group.job_group_model import JobGroup
    from backend.api_v1.talent_status.talent_status_model import TalentStatus


class PlanScopeDefault(IntIdPkMixin, TimestampMixin, Base):
    """Default planning scope profiles used to build every new session.

    Each row is one scope profile:
      - talent_status_id IS NULL  -> Option 2: combined (all active statuses)
      - talent_status_id set      -> Option 1: per-status

    Copied into plan_scopes (multiplied by departments) at session creation.
    Changes here affect future sessions only.
    """

    __tablename__ = "plan_scope_defaults"
    __table_args__ = (
        UniqueConstraint(
            "job_group_id",
            "talent_status_id",
            name="uq_plan_scope_default_jg_ts",
        ),
    )

    job_group_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("job_groups.id"),
        nullable=False,
    )
    talent_status_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("talent_statuses.id"),
        nullable=True,
    )

    job_group: Mapped["JobGroup"] = relationship(lazy="selectin")
    talent_status: Mapped["TalentStatus | None"] = relationship(lazy="selectin")

    def __repr__(self) -> str:
        return (
            f"<PlanScopeDefault(id={self.id}, job_group_id={self.job_group_id}, "
            f"talent_status_id={self.talent_status_id})>"
        )

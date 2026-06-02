from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import Integer, ForeignKey, UniqueConstraint, CheckConstraint
from backend.api_v1.base.base_model import Base
from backend.api_v1.base.models.utils.mixins import IntIdPkMixin, TimestampMixin
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from backend.api_v1.planning.plan_session.plan_session_model import PlanSession
    from backend.api_v1.department.department_model import Department
    from backend.api_v1.job_group.job_group_model import JobGroup
    from backend.api_v1.talent_status.talent_status_model import TalentStatus


class PlanScope(IntIdPkMixin, TimestampMixin, Base):
    """One editable plan row for a session.

    Generated at session creation as the cross product of
    (departments resolved from the session's categories) x (scope profiles
    copied from plan_scope_defaults).

    Scope profile shape:
      - talent_status_id IS NULL -> Option 2 (combined, all active statuses)
      - talent_status_id set     -> Option 1 (per-status)

    `value` is the plan target: integer 0..100, NULL until the user sets it.
    Editable only while the parent session status key == 'open'.
    """

    __tablename__ = "plan_scopes"
    __table_args__ = (
        UniqueConstraint(
            "plan_session_id",
            "department_id",
            "job_group_id",
            "talent_status_id",
            name="uq_plan_scope_session_dept_jg_ts",
        ),
        CheckConstraint(
            "value IS NULL OR (value >= 0 AND value <= 100)",
            name="ck_plan_scope_value_range",
        ),
    )

    plan_session_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("plan_sessions.id", ondelete="CASCADE"),
        nullable=False,
    )
    department_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("departments.id"),
        nullable=False,
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
    value: Mapped[int | None] = mapped_column(Integer, nullable=True)

    plan_session: Mapped["PlanSession"] = relationship(
        back_populates="scopes",
    )
    department: Mapped["Department"] = relationship(lazy="selectin")
    job_group: Mapped["JobGroup"] = relationship(lazy="selectin")
    talent_status: Mapped["TalentStatus | None"] = relationship(lazy="selectin")

    def __repr__(self) -> str:
        return (
            f"<PlanScope(id={self.id}, plan_session_id={self.plan_session_id}, "
            f"department_id={self.department_id}, job_group_id={self.job_group_id}, "
            f"talent_status_id={self.talent_status_id}, value={self.value})>"
        )

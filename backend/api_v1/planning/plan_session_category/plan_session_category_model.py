from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, Integer, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.api_v1.base.base_model import Base
from backend.api_v1.base.models.utils.mixins import IntIdPkMixin, TimestampMixin

if TYPE_CHECKING:
    from backend.api_v1.department_category.department_category_model import (
        DepartmentCategory,
    )
    from backend.api_v1.planning.plan_session.plan_session_model import PlanSession


class PlanSessionCategory(IntIdPkMixin, TimestampMixin, Base):
    """Frozen copy of the department categories used by one plan session.

    Snapshotted from plan_category_defaults at session creation so the session
    config is reproducible year-to-year regardless of later default changes.
    """

    __tablename__ = "plan_session_categories"
    __table_args__ = (
        UniqueConstraint(
            "plan_session_id",
            "department_category_id",
            name="uq_plan_session_category",
        ),
    )

    plan_session_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("plan_sessions.id", ondelete="CASCADE"),
        nullable=False,
    )
    department_category_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("department_categories.id"),
        nullable=False,
    )

    plan_session: Mapped["PlanSession"] = relationship(
        back_populates="categories",
    )
    department_category: Mapped["DepartmentCategory"] = relationship(
        lazy="selectin",
    )

    def __repr__(self) -> str:
        return (
            f"<PlanSessionCategory(id={self.id}, "
            f"plan_session_id={self.plan_session_id}, "
            f"department_category_id={self.department_category_id})>"
        )

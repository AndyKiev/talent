from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, Integer, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.api_v1.base.base_model import Base
from backend.api_v1.base.models.utils.mixins import IntIdPkMixin, TimestampMixin

if TYPE_CHECKING:
    from backend.api_v1.department_category.department_category_model import (
        DepartmentCategory,
    )


class PlanCategoryDefault(IntIdPkMixin, TimestampMixin, Base):
    """Default set of department categories used to build every new session.

    A flat list of department_category ids. Copied into plan_session_categories
    at session creation time. Changes here affect future sessions only.
    """

    __tablename__ = "plan_category_defaults"
    __table_args__ = (
        UniqueConstraint(
            "department_category_id",
            name="uq_plan_category_default_category",
        ),
    )

    department_category_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("department_categories.id"),
        nullable=False,
    )

    department_category: Mapped["DepartmentCategory"] = relationship(
        lazy="selectin",
    )

    def __repr__(self) -> str:
        return (
            f"<PlanCategoryDefault(id={self.id}, "
            f"department_category_id={self.department_category_id})>"
        )

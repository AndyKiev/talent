from __future__ import annotations

from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import String, Boolean, ForeignKey
from backend.api_v1.base.base_model import Base
from backend.api_v1.base.models import IntIdPkMixin, TimestampMixin
from typing import Optional, TYPE_CHECKING

if TYPE_CHECKING:
    from backend.api_v1.department_type.department_type_model import DepartmentType
    from backend.api_v1.department_category.department_category_model import (
        DepartmentCategory,
    )


class Department(IntIdPkMixin, TimestampMixin, Base):

    name: Mapped[str] = mapped_column(String(128), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    # Self-referential FK — NULL for root departments
    parent_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("departments.id", ondelete="RESTRICT"),
        nullable=True,
        index=True,
    )

    department_category_id: Mapped[int] = mapped_column(
        ForeignKey("department_categories.id", ondelete="RESTRICT"),
        nullable=False,
    )
    department_type_id: Mapped[int] = mapped_column(
        ForeignKey("department_types.id", ondelete="RESTRICT"),
        nullable=False,
    )

    # Self-referential relationships
    # `lazy="selectin"` on `children` makes SQLAlchemy recursively load the
    # full subtree in O(depth) round-trips — acceptable for ≤7 levels.
    parent: Mapped[Optional["Department"]] = relationship(
        "Department",
        back_populates="children",
        remote_side="Department.id",  # scalar side = parent
        lazy="selectin",
        foreign_keys="[Department.parent_id]",
    )
    children: Mapped[list["Department"]] = relationship(
        "Department",
        back_populates="parent",
        lazy="selectin",
        foreign_keys="[Department.parent_id]",
    )

    # FK relationships
    department_category: Mapped["DepartmentCategory"] = relationship(
        back_populates="departments",
        lazy="selectin",
    )
    department_type: Mapped["DepartmentType"] = relationship(
        back_populates="departments",
        lazy="selectin",
    )

    def __repr__(self) -> str:
        return f"<Department(id={self.id}, name='{self.name}', parent_id={self.parent_id})>"

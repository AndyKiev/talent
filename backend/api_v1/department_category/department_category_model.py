from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import String, Boolean, Text, Integer
from backend.api_v1.base.base_model import Base
from backend.api_v1.base.models import IntIdPkMixin, TimestampMixin
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from backend.api_v1.department.department_model import Department


class DepartmentCategory(IntIdPkMixin, TimestampMixin, Base):
    __tablename__ = "department_categories"
    name: Mapped[str] = mapped_column(String(64), nullable=False)
    key: Mapped[str | None] = mapped_column(String(64), nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    is_main: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    # When True, this category is offered in the RESPONSIBILITY_DEPTS_CHANGE
    # event as a source of responsibility department TYPES (the types of the
    # employee's main-department children in this category).
    is_responsibility: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False
    )
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    departments: Mapped[list["Department"]] = relationship(
        back_populates="department_category",
        lazy="selectin",
    )

    def __repr__(self) -> str:
        return (
            f"<DepartmentCategory(id={self.id}, name='{self.name}', key='{self.key}')>"
        )

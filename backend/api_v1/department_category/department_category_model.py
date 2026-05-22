from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import String, Boolean, Text
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

    departments: Mapped[list["Department"]] = relationship(
        back_populates="department_category",
        lazy="selectin",
    )

    def __repr__(self) -> str:
        return f"<DepartmentCategory(id={self.id}, name='{self.name}', key='{self.key}')>"

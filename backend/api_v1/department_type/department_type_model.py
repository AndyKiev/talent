from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import String, Boolean, Text
from backend.api_v1.base.base_model import Base
from backend.api_v1.base.models import IntIdPkMixin, TimestampMixin
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from backend.api_v1.department.department_model import Department
    from backend.api_v1.department_type_job_link.department_type_job_link_model import (
        DepartmentTypeJobLink,
    )


class DepartmentType(IntIdPkMixin, TimestampMixin, Base):
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    departments: Mapped[list["Department"]] = relationship(
        back_populates="department_type",
        lazy="selectin",
    )

    # Self-referential many-to-many via association table
    parents: Mapped[list["DepartmentType"]] = relationship(
        "DepartmentType",
        secondary="department_type_parental_links",
        primaryjoin="DepartmentType.id == DepartmentTypeParentalLink.child_id",
        secondaryjoin="DepartmentType.id == DepartmentTypeParentalLink.parent_id",
        back_populates="children",
        lazy="selectin",
    )

    children: Mapped[list["DepartmentType"]] = relationship(
        "DepartmentType",
        secondary="department_type_parental_links",
        primaryjoin="DepartmentType.id == DepartmentTypeParentalLink.parent_id",
        secondaryjoin="DepartmentType.id == DepartmentTypeParentalLink.child_id",
        back_populates="parents",
        lazy="selectin",
    )

    # Many-to-many with Job via DepartmentTypeJobLink
    _jobs: Mapped[list["DepartmentTypeJobLink"]] = relationship(
        back_populates="department_type",
        lazy="noload",
    )

    @property
    def jobs(self) -> list:
        return [link.job for link in self._jobs if link.job]

    def __repr__(self) -> str:
        return f"<DepartmentType(id={self.id}, name='{self.name}')>"

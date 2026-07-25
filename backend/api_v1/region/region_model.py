from typing import TYPE_CHECKING

from sqlalchemy import Boolean, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.api_v1.base.base_model import Base
from backend.api_v1.base.models import IntIdPkMixin, TimestampMixin

if TYPE_CHECKING:
    from backend.api_v1.department_region_link.department_region_link_model import (
        DepartmentRegionLink,
    )


class Region(IntIdPkMixin, TimestampMixin, Base):
    __tablename__ = "regions"
    __table_args__ = (
        UniqueConstraint("name", name="idx_uq_region_name"),
        UniqueConstraint("key", name="idx_uq_region_key"),
    )

    name: Mapped[str] = mapped_column(String(128), nullable=False)
    key: Mapped[str] = mapped_column(String(64), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    # Gap-10 manual ordering (10, 20, 30, ...). Set by the service on create
    # and renumbered on move. Default 10 keeps the column non-nullable for the
    # very first row before the service assigns a value.
    sort_order: Mapped[int] = mapped_column(
        Integer, nullable=False, default=10, server_default="10", index=True
    )

    department_links: Mapped[list["DepartmentRegionLink"]] = relationship(
        back_populates="region",
        lazy="selectin",
    )

    def __repr__(self) -> str:
        return f"<Region(id={self.id}, name='{self.name}', key='{self.key}', sort_order={self.sort_order})>"

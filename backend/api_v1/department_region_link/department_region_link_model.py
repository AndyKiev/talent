import datetime
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, ForeignKey, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.api_v1.base.base_model import Base
from backend.api_v1.base.models.utils.mixins import IntIdPkMixin

if TYPE_CHECKING:
    from backend.api_v1.department.department_model import Department
    from backend.api_v1.region.region_model import Region


class DepartmentRegionLink(IntIdPkMixin, Base):
    __tablename__ = "department_region_links"
    __table_args__ = (
        # Enforces one-to-one: a department can sit in at most one region.
        UniqueConstraint(
            "department_id",
            name="idx_uq_department_region_department",
        ),
    )

    department_id: Mapped[int] = mapped_column(
        ForeignKey("departments.id", ondelete="RESTRICT"),
        nullable=False,
    )
    region_id: Mapped[int] = mapped_column(
        ForeignKey("regions.id", ondelete="RESTRICT"),
        nullable=False,
    )
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    department: Mapped["Department"] = relationship(
        lazy="selectin",
    )
    region: Mapped["Region"] = relationship(
        back_populates="department_links",
        lazy="selectin",
    )

    def __repr__(self) -> str:
        return (
            f"<DepartmentRegionLink("
            f"id={self.id}, "
            f"department_id={self.department_id}, "
            f"region_id={self.region_id}"
            f")>"
        )

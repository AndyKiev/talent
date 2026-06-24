from typing import TYPE_CHECKING, Optional
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import ForeignKey, Boolean, UniqueConstraint, func, DateTime
from backend.api_v1.base.base_model import Base
from backend.api_v1.base.models.utils.mixins import IntIdPkMixin
import datetime

if TYPE_CHECKING:
    from backend.api_v1.department_type.department_type_model import DepartmentType
    from backend.api_v1.job.job_model import Job


class DepartmentTypeJobLink(IntIdPkMixin, Base):
    __tablename__ = "department_type_job_links"
    __table_args__ = (
        UniqueConstraint(
            "department_type_id",
            "job_id",
            name="idx_uq_department_type_job",
        ),
    )

    department_type_id: Mapped[int] = mapped_column(
        ForeignKey("department_types.id", ondelete="RESTRICT"),
        nullable=False,
    )
    job_id: Mapped[int] = mapped_column(
        ForeignKey("jobs.id", ondelete="RESTRICT"),
        nullable=False,
    )
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    department_type: Mapped["DepartmentType"] = relationship(
        back_populates="_jobs",
        lazy="selectin",
    )
    job: Mapped["Job"] = relationship(
        back_populates="_department_types",
        lazy="selectin",
    )

    def __repr__(self) -> str:
        return (
            f"<DepartmentTypeJobLink("
            f"id={self.id}, "
            f"department_type_id={self.department_type_id}, "
            f"job_id={self.job_id}"
            f")>"
        )

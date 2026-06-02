from typing import TYPE_CHECKING
import datetime

from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import ForeignKey, Boolean, UniqueConstraint, func, DateTime

from backend.api_v1.base.base_model import Base
from backend.api_v1.base.models.utils.mixins import IntIdPkMixin

if TYPE_CHECKING:
    from backend.api_v1.job.job_model import Job
    from backend.api_v1.department_category.department_category_model import (
        DepartmentCategory,
    )


class JobResponsibilityCategoryLink(IntIdPkMixin, Base):
    """
    Defines which department CATEGORIES are valid as *responsibility*
    departments for a given job — independent of the category's `is_main`
    flag.

    Examples:
      - segment_manager -> store_departments
      - HRS (hypermarket) -> hypermarket
      - HRS (directorate) -> directorate

    Fallback (handled in the service / picker): if a job has NO links here,
    responsibility categories default to those where is_main=false.
    """

    __tablename__ = "job_responsibility_category_links"
    __table_args__ = (
        UniqueConstraint(
            "job_id",
            "department_category_id",
            name="idx_uq_job_responsibility_category",
        ),
    )

    job_id: Mapped[int] = mapped_column(
        ForeignKey("jobs.id", ondelete="RESTRICT"),
        nullable=False,
    )
    department_category_id: Mapped[int] = mapped_column(
        ForeignKey("department_categories.id", ondelete="RESTRICT"),
        nullable=False,
    )
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    job: Mapped["Job"] = relationship(lazy="selectin")
    department_category: Mapped["DepartmentCategory"] = relationship(lazy="selectin")

    def __repr__(self) -> str:
        return (
            f"<JobResponsibilityCategoryLink("
            f"id={self.id}, job_id={self.job_id}, "
            f"department_category_id={self.department_category_id})>"
        )

from typing import TYPE_CHECKING, Optional
import datetime

from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import (
    CheckConstraint,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    UniqueConstraint,
    func,
)

from backend.api_v1.base.base_model import Base
from backend.api_v1.base.models import IntIdPkMixin

if TYPE_CHECKING:
    from backend.api_v1.department.department_model import Department
    from backend.api_v1.department_type_job_link.department_type_job_link_model import (
        DepartmentTypeJobLink,
    )
    from backend.api_v1.employee.employee_model import Employee


class DepartmentJobTarget(IntIdPkMixin, Base):
    """
    Effective-dated target headcount for one job in one department INSTANCE.

    The job is referenced through the department-type job link
    (department_type_job_links.id): deleting the link (or the department)
    cascades away its targets. The plan value "as of date D" is the qty of
    the row with the greatest effective_date <= D.
    """

    __tablename__ = "department_job_targets"
    __table_args__ = (
        UniqueConstraint(
            "department_id",
            "department_type_job_link_id",
            "effective_date",
            name="idx_uq_department_job_target_date",
        ),
        CheckConstraint("qty >= 0", name="ck_department_job_targets_qty_nonneg"),
    )

    department_id: Mapped[int] = mapped_column(
        ForeignKey("departments.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    department_type_job_link_id: Mapped[int] = mapped_column(
        ForeignKey("department_type_job_links.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    qty: Mapped[int] = mapped_column(Integer, nullable=False)
    effective_date: Mapped[datetime.date] = mapped_column(Date, nullable=False)
    # Who set the current qty and when — refreshed on every edit, so it always
    # answers "who set this value" rather than "who inserted the row".
    created_by: Mapped[Optional[int]] = mapped_column(
        ForeignKey("employees.id", ondelete="SET NULL"),
        nullable=True,
    )
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    department: Mapped["Department"] = relationship(lazy="selectin")
    link: Mapped["DepartmentTypeJobLink"] = relationship(lazy="selectin")
    author: Mapped[Optional["Employee"]] = relationship(
        foreign_keys=[created_by],
        lazy="selectin",
    )

    def __repr__(self) -> str:
        return (
            f"<DepartmentJobTarget("
            f"id={self.id}, "
            f"department_id={self.department_id}, "
            f"department_type_job_link_id={self.department_type_job_link_id}, "
            f"qty={self.qty}, "
            f"effective_date={self.effective_date}"
            f")>"
        )

from datetime import date
from typing import TYPE_CHECKING
from sqlalchemy.orm import mapped_column, Mapped, relationship
from sqlalchemy import UniqueConstraint, ForeignKey, Date
from backend.api_v1.base.base_model import Base
from backend.api_v1.base.models.utils.mixins import IntIdPkMixin, TimestampMixin

if TYPE_CHECKING:
    from backend.api_v1.employee.employee_model import Employee


class EmployeePersonalData(IntIdPkMixin, TimestampMixin, Base):
    # Per-employee EMPLOYMENT data, kept off the employees table (1:1). Holds
    # only employee-level dates; PERSON-level facts (sex, marital status,
    # birth date) live on persons via employees.person_id.
    __tablename__ = "employee_personal_data"
    __table_args__ = (
        UniqueConstraint("employee_id", name="uq_employee_personal_data_employee_id"),
    )
    employee_id: Mapped[int] = mapped_column(ForeignKey("employees.id"), nullable=False)
    # Date the employee joined the company (drives tenure / "years with company").
    hire_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    # Date the employee was assigned to their current/last job (set manually for
    # now; could later be derived from employee_events).
    job_assigned_date: Mapped[date | None] = mapped_column(Date, nullable=True)

    employee: Mapped["Employee"] = relationship(
        back_populates="personal_data", lazy="selectin"
    )

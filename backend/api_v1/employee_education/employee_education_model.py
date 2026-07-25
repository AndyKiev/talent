
from sqlalchemy import ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from backend.api_v1.base.base_model import Base
from backend.api_v1.base.models import IntIdPkMixin, TimestampMixin


class EmployeeEducation(IntIdPkMixin, TimestampMixin, Base):
    """One education record for an employee (1:N). Lives in its own table, off
    the employees table. degree_id references the education_degrees lookup; the
    label is resolved on the frontend from the degrees list (we keep degree_id
    only here, no relationship serialization)."""

    __tablename__ = "employee_educations"

    employee_id: Mapped[int] = mapped_column(ForeignKey("employees.id"), nullable=False)
    institution: Mapped[str] = mapped_column(String(256), nullable=False)
    degree_id: Mapped[int | None] = mapped_column(
        ForeignKey("education_degrees.id"), nullable=True
    )
    speciality: Mapped[str | None] = mapped_column(String(256), nullable=True)
    graduation_year: Mapped[int | None] = mapped_column(Integer, nullable=True)

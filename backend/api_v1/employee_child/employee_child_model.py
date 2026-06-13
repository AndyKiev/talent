from datetime import date
from sqlalchemy import ForeignKey, Date
from sqlalchemy.orm import Mapped, mapped_column
from backend.api_v1.base.base_model import Base
from backend.api_v1.base.models import IntIdPkMixin, TimestampMixin


class EmployeeChild(IntIdPkMixin, TimestampMixin, Base):
    """One child of an employee (1:N). Lives in its own table, off the employees
    table. We store only the birth date (no name) — the UI derives the count of
    children aged <= 14 from these birth dates."""

    __tablename__ = "employee_children"

    employee_id: Mapped[int] = mapped_column(ForeignKey("employees.id"), nullable=False)
    birth_date: Mapped[date] = mapped_column(Date, nullable=False)

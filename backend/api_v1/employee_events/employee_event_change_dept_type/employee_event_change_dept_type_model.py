from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import String
from typing import TYPE_CHECKING

from backend.api_v1.base.base_model import Base
from backend.api_v1.base.models import IntIdPkMixin


if TYPE_CHECKING:
    from backend.api_v1.employee_events.employee_event_change_department.employee_event_change_department_model import (
        EmployeeEventChangeDepartment,
    )


class EmployeeEventChangeDeptType(IntIdPkMixin, Base):
    """
    Seeded lookup — distinguishes the two roles a department can play
    inside an EmployeeEventChangeDepartment row.

    Seed values:
        MAIN_DEPT         — the employee's top-level department
                            (one per change row, defined by department_category)
        RESPONSIBILITY_DEPT — a department in the employee's responsibility area
                            (many per change row, children of the main dept)
    """

    __tablename__ = "employee_event_change_dept_types"

    code: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(128), nullable=False)

    dept_changes: Mapped[list["EmployeeEventChangeDepartment"]] = relationship(
        back_populates="change_dept_type",
        lazy="selectin",
    )

    def __repr__(self) -> str:
        return f"<EmployeeEventChangeDeptType(id={self.id}, code='{self.code}')>"

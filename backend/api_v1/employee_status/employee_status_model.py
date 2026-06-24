from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import String, Text
from backend.api_v1.base.base_model import Base
from backend.api_v1.base.models import IntIdPkMixin, TimestampMixin
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from backend.api_v1.employee.employee_model import Employee


class EmployeeStatus(IntIdPkMixin, TimestampMixin, Base):
    __tablename__ = "employee_statuses"
    name: Mapped[str] = mapped_column(String(64), nullable=False, unique=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    employees: Mapped[list["Employee"]] = relationship(
        back_populates="status",
        lazy="selectin",
    )

    def __repr__(self) -> str:
        return f"<EmployeeStatus(id={self.id}, name='{self.name}')>"

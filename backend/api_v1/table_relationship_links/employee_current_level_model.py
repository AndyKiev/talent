from typing import TYPE_CHECKING
from sqlalchemy.orm import mapped_column, Mapped, relationship
from sqlalchemy import UniqueConstraint, ForeignKey
from backend.api_v1.base.base_model import Base
from backend.api_v1.base.models.utils.mixins import IntIdPkMixin, TimestampMixin

if TYPE_CHECKING:
    from backend.api_v1.employee.employee_model import Employee


class EmployeeCurrentLevel(IntIdPkMixin, TimestampMixin, Base):
    # __tablename__ = "employee_current_levels"
    # One current career level per employee (people-review). Lives in its own
    # table so the employees table stays clean — employee_id is unique (1:1).
    __table_args__ = (
        UniqueConstraint("employee_id", name="uq_employee_current_level_employee_id"),
    )
    employee_id: Mapped[int] = mapped_column(
        ForeignKey("employees.id"), nullable=False
    )
    level_id: Mapped[int] = mapped_column(
        ForeignKey("review_levels.id"), nullable=False
    )

    employee: Mapped["Employee"] = relationship(
        back_populates="current_level_link", lazy="selectin"
    )

from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.api_v1.base.base_model import Base
from backend.api_v1.base.models.utils.mixins import IntIdPkMixin, TimestampMixin

if TYPE_CHECKING:
    from backend.api_v1.employee.employee_model import Employee
    from backend.api_v1.user_group.user_group_model import UserGroup


class EmployeeUserGroupLink(IntIdPkMixin, TimestampMixin, Base):
    # __tablename__ = "employee_user_group_link"
    __table_args__ = (
        UniqueConstraint(
            "employee_id",
            "user_group_id",
            name="idx_uq_user_user_group",
        ),
    )
    employee_id: Mapped[int] = mapped_column(ForeignKey("employees.id"))
    user_group_id: Mapped[int] = mapped_column(ForeignKey("user_groups.id"))

    employee: Mapped["Employee"] = relationship(
        back_populates="user_groups", lazy="selectin"
    )
    user_group: Mapped["UserGroup"] = relationship(
        back_populates="employees", lazy="selectin"
    )

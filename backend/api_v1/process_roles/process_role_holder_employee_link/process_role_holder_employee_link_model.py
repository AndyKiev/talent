from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, ForeignKeyConstraint, Integer, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.api_v1.base.base_model import Base
from backend.api_v1.base.models import IntIdPkMixin, TimestampMixin

if TYPE_CHECKING:
    from backend.api_v1.employee.employee_model import Employee
    from backend.api_v1.process_roles.process_role_holder.process_role_holder_model import (
        ProcessRoleHolder,
    )


class ProcessRoleHolderEmployeeLink(IntIdPkMixin, TimestampMixin, Base):
    __tablename__ = "process_role_holder_employee_links"
    __table_args__ = (
        # composite FK -> keeps the denormalized process_role_id provably equal to the
        # holder's role; RESTRICT means a holder can't be deleted while links exist.
        ForeignKeyConstraint(
            ["process_role_holder_id", "process_role_id"],
            ["process_role_holders.id", "process_role_holders.process_role_id"],
            ondelete="RESTRICT",
            name="fk_prhe_holder_role",
        ),
        # one holder per employee, per role -> the single-reviewer guarantee
        UniqueConstraint(
            "process_role_id", "employee_id", name="uq_prhe_role_employee"
        ),
    )

    process_role_holder_id: Mapped[int] = mapped_column(nullable=False, index=True)
    # denormalized copy of the holder's role (set server-side from the holder)
    process_role_id: Mapped[int] = mapped_column(nullable=False)
    employee_id: Mapped[int] = mapped_column(
        ForeignKey("employees.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    # Per-holder roster order for oversight presentation (multiples of 10).
    # NULL sorts last, so a newly-assigned employee lands at the end.
    order_position: Mapped[int | None] = mapped_column(Integer, nullable=True)

    holder: Mapped[ProcessRoleHolder] = relationship(
        "ProcessRoleHolder",
        primaryjoin=(
            "ProcessRoleHolderEmployeeLink.process_role_holder_id "
            "== ProcessRoleHolder.id"
        ),
        foreign_keys="[ProcessRoleHolderEmployeeLink.process_role_holder_id]",
        back_populates="employees",
        lazy="selectin",
    )
    employee: Mapped[Employee] = relationship(
        "Employee",
        foreign_keys="[ProcessRoleHolderEmployeeLink.employee_id]",
        lazy="selectin",
    )

    @property
    def employee_code(self) -> str | None:
        return self.employee.code if self.employee else None

    @property
    def employee_name(self) -> str | None:
        return self.employee.name if self.employee else None

    def __repr__(self) -> str:
        return (
            f"<ProcessRoleHolderEmployeeLink(id={self.id}, "
            f"holder_id={self.process_role_holder_id}, employee={self.employee_id})>"
        )

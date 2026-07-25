from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.api_v1.base.base_model import Base
from backend.api_v1.base.models import IntIdPkMixin, TimestampMixin

if TYPE_CHECKING:
    from backend.api_v1.employee.employee_model import Employee
    from backend.api_v1.process_roles.process_role.process_role_model import ProcessRole
    from backend.api_v1.process_roles.process_role_holder_department_link.process_role_holder_department_link_model import (
        ProcessRoleHolderDepartmentLink,
    )
    from backend.api_v1.process_roles.process_role_holder_employee_link.process_role_holder_employee_link_model import (
        ProcessRoleHolderEmployeeLink,
    )


class ProcessRoleHolder(IntIdPkMixin, TimestampMixin, Base):
    __tablename__ = "process_role_holders"
    __table_args__ = (
        UniqueConstraint(
            "process_role_id", "holder_employee_id", name="uq_prh_role_holder"
        ),
        # composite-FK target for the leaf table (see leaf model)
        UniqueConstraint("id", "process_role_id", name="uq_prh_id_role"),
    )

    process_role_id: Mapped[int] = mapped_column(
        ForeignKey("process_roles.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    holder_employee_id: Mapped[int] = mapped_column(
        ForeignKey("employees.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    # current authenticated user at assignment time; reserved for later
    # user_group / essence-based access restriction. Set server-side.
    assigned_by: Mapped[int] = mapped_column(
        ForeignKey("employees.id", ondelete="RESTRICT"),
        nullable=False,
    )

    process_role: Mapped[ProcessRole] = relationship(
        back_populates="holders",
        lazy="selectin",
    )
    # two FKs to employees -> each relationship needs explicit foreign_keys
    holder: Mapped[Employee] = relationship(
        "Employee",
        foreign_keys="[ProcessRoleHolder.holder_employee_id]",
        lazy="selectin",
    )
    assigner: Mapped[Employee] = relationship(
        "Employee",
        foreign_keys="[ProcessRoleHolder.assigned_by]",
        lazy="selectin",
    )
    employees: Mapped[list[ProcessRoleHolderEmployeeLink]] = relationship(
        "ProcessRoleHolderEmployeeLink",
        primaryjoin=(
            "ProcessRoleHolder.id "
            "== ProcessRoleHolderEmployeeLink.process_role_holder_id"
        ),
        foreign_keys=("[ProcessRoleHolderEmployeeLink.process_role_holder_id]"),
        back_populates="holder",
        lazy="selectin",
    )
    department_links: Mapped[list[ProcessRoleHolderDepartmentLink]] = relationship(
        "ProcessRoleHolderDepartmentLink",
        primaryjoin=(
            "ProcessRoleHolder.id "
            "== ProcessRoleHolderDepartmentLink.process_role_holder_id"
        ),
        foreign_keys=("[ProcessRoleHolderDepartmentLink.process_role_holder_id]"),
        back_populates="holder",
        lazy="selectin",
    )

    @property
    def holder_code(self) -> str | None:
        return self.holder.code if self.holder else None

    @property
    def holder_name(self) -> str | None:
        return self.holder.name if self.holder else None

    @property
    def assigner_name(self) -> str | None:
        return self.assigner.name if self.assigner else None

    @property
    def role_name(self) -> str | None:
        return self.process_role.name if self.process_role else None

    def __repr__(self) -> str:
        return (
            f"<ProcessRoleHolder(id={self.id}, role_id={self.process_role_id}, "
            f"holder={self.holder_employee_id})>"
        )

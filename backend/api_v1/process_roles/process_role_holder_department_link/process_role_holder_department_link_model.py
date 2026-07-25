from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, ForeignKeyConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.api_v1.base.base_model import Base
from backend.api_v1.base.models import IntIdPkMixin, TimestampMixin

if TYPE_CHECKING:
    from backend.api_v1.department.department_model import Department
    from backend.api_v1.process_roles.process_role_holder.process_role_holder_model import (
        ProcessRoleHolder,
    )


class ProcessRoleHolderDepartmentLink(IntIdPkMixin, TimestampMixin, Base):
    """A supervision-style holder's department list. Links a process_role_holder to
    a department instance (the holder then covers that department's subtree).

    Unlike the employee leaf there is NO unique(process_role_id, department_id):
    a department may have multiple supervisors. Removing a row is the way to unassign.
    """

    __tablename__ = "process_role_holder_department_links"
    __table_args__ = (
        # composite FK -> keeps the denormalized process_role_id provably equal to the
        # holder's role; RESTRICT means a holder can't be deleted while links exist.
        ForeignKeyConstraint(
            ["process_role_holder_id", "process_role_id"],
            ["process_role_holders.id", "process_role_holders.process_role_id"],
            ondelete="RESTRICT",
            name="fk_prhd_holder_role",
        ),
    )

    process_role_holder_id: Mapped[int] = mapped_column(nullable=False, index=True)
    # denormalized copy of the holder's role (set server-side from the holder)
    process_role_id: Mapped[int] = mapped_column(nullable=False)
    department_id: Mapped[int] = mapped_column(
        ForeignKey("departments.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )

    holder: Mapped[ProcessRoleHolder] = relationship(
        "ProcessRoleHolder",
        primaryjoin=(
            "ProcessRoleHolderDepartmentLink.process_role_holder_id "
            "== ProcessRoleHolder.id"
        ),
        foreign_keys="[ProcessRoleHolderDepartmentLink.process_role_holder_id]",
        back_populates="department_links",
        lazy="selectin",
    )
    department: Mapped[Department] = relationship(
        "Department",
        foreign_keys="[ProcessRoleHolderDepartmentLink.department_id]",
        lazy="selectin",
    )

    @property
    def department_name(self) -> str | None:
        return self.department.name if self.department else None

    def __repr__(self) -> str:
        return (
            f"<ProcessRoleHolderDepartmentLink(id={self.id}, "
            f"holder_id={self.process_role_holder_id}, dept={self.department_id})>"
        )

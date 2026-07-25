from __future__ import annotations

from sqlalchemy import ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from backend.api_v1.base.base_model import Base
from backend.api_v1.base.models import IntIdPkMixin, TimestampMixin


class ProcessRoleActiveContext(IntIdPkMixin, TimestampMixin, Base):
    """Per-user 'which mode am I in' state for people-review.

    One row per employee. `process_role_id` NULL = no mode on (sees only self).
    `department_id` is the selected department instance when the active role's
    link_target is 'department' (supervision). Persisted in the DB so the choice
    is shared across all the user's pages. NOT stored on the employees table.
    """

    __tablename__ = "process_role_active_contexts"
    __table_args__ = (UniqueConstraint("employee_id", name="uq_prac_employee"),)

    employee_id: Mapped[int] = mapped_column(
        ForeignKey("employees.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    process_role_id: Mapped[int | None] = mapped_column(
        ForeignKey("process_roles.id", ondelete="RESTRICT"),
        nullable=True,
    )
    department_id: Mapped[int | None] = mapped_column(
        ForeignKey("departments.id", ondelete="RESTRICT"),
        nullable=True,
    )

    def __repr__(self) -> str:
        return (
            f"<ProcessRoleActiveContext(employee_id={self.employee_id}, "
            f"process_role_id={self.process_role_id}, department_id={self.department_id})>"
        )

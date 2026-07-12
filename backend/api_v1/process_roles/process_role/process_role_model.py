from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import String, Boolean, ForeignKey, UniqueConstraint, CheckConstraint
from backend.api_v1.base.base_model import Base
from backend.api_v1.base.models import IntIdPkMixin, TimestampMixin
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from backend.api_v1.process_roles.process.process_model import Process
    from backend.api_v1.process_roles.process_role_holder.process_role_holder_model import (
        ProcessRoleHolder,
    )


class ProcessRole(IntIdPkMixin, TimestampMixin, Base):
    __tablename__ = "process_roles"
    __table_args__ = (
        UniqueConstraint("process_id", "key", name="uq_process_role_process_key"),
        CheckConstraint(
            "link_target in ('employee', 'department')",
            name="ck_process_role_link_target",
        ),
    )

    process_id: Mapped[int] = mapped_column(
        ForeignKey("processes.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    # Compact label for tight UIs (jobs-grid chips); falls back to name when NULL.
    short_name: Mapped[str | None] = mapped_column(String(32), nullable=True)
    key: Mapped[str | None] = mapped_column(String(64), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    # What this role's holders are linked to: 'employee' (oversight-style roster)
    # or 'department' (supervision — department subtree). Drives both the admin
    # assignment picker and the people-review visibility resolver.
    link_target: Mapped[str] = mapped_column(
        String(16), nullable=False, default="employee", server_default="employee"
    )

    process: Mapped["Process"] = relationship(
        back_populates="roles",
        lazy="selectin",
    )
    holders: Mapped[list["ProcessRoleHolder"]] = relationship(
        back_populates="process_role",
        lazy="selectin",
    )

    @property
    def process_name(self) -> str | None:
        return self.process.name if self.process else None

    def __repr__(self) -> str:
        return (
            f"<ProcessRole(id={self.id}, process_id={self.process_id}, "
            f"name='{self.name}')>"
        )

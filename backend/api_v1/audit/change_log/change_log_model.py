import datetime
from typing import TYPE_CHECKING, Optional

from sqlalchemy import DateTime, ForeignKey, Integer, String, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.api_v1.base.base_model import Base
from backend.api_v1.base.models.utils.mixins import IntIdPkMixin

if TYPE_CHECKING:
    from backend.api_v1.employee.employee_model import Employee


class ChangeLog(IntIdPkMixin, Base):
    """
    One mutation entry. Always belongs to a change_session (which carries the
    actor). `parent_id` is a self-link used to attribute cascaded changes to the
    action that caused them — e.g. the talent_audit_job status_change rows point
    to the employee_event 'apply' entry that triggered them, enabling exact
    reversal on event delete.

    `essence_key` is a free string (e.g. 'employee_event', 'talent_audit_job')
    so new essences can be logged with zero schema change.
    """

    __tablename__ = "change_log"

    change_session_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("change_session.id", ondelete="RESTRICT"),
        nullable=False,
    )
    # Self-link: the entry whose action caused this one (NULL for top-level).
    parent_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("change_log.id", ondelete="SET NULL"),
        nullable=True,
    )
    # Free string identifying the changed essence (no FK — max extensibility).
    essence_key: Mapped[str] = mapped_column(String(64), nullable=False)
    # PK of the changed row (NULL only transiently before a create is flushed).
    entity_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    # 'create' | 'update' | 'delete' | 'apply' | 'status_change' | ...
    action: Mapped[str] = mapped_column(String(32), nullable=False)
    # Field-level before/after, e.g.
    # {"status_id": {"old": 3, "new": 5}, "status_key": {"old": "created", "new": "applied"}}
    changes: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    # Subject employee this entry concerns (set for employee_event entries).
    # Lets the audit UI show "who" even for bulk sweeps, where the run itself
    # has no single employee. Resolvable post-delete (employees aren't deleted).
    employee_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("employees.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    employee: Mapped[Optional["Employee"]] = relationship(
        foreign_keys=[employee_id],
        lazy="selectin",
    )

    def __repr__(self) -> str:
        return (
            f"<ChangeLog(id={self.id}, session={self.change_session_id}, "
            f"essence='{self.essence_key}', entity_id={self.entity_id}, "
            f"action='{self.action}')>"
        )

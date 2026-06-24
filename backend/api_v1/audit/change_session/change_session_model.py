import datetime
from typing import TYPE_CHECKING, Optional

from sqlalchemy import DateTime, ForeignKey, Integer, String, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.api_v1.base.base_model import Base
from backend.api_v1.base.models.utils.mixins import IntIdPkMixin

if TYPE_CHECKING:
    from backend.api_v1.employee.employee_model import Employee


class ChangeSession(IntIdPkMixin, Base):
    """
    A single unit of work (run) that groups one or more change_log entries.

    The ACTOR lives here, not on the log rows:
      - manual : source='manual', triggered_by_user_id=<user>, task_name=NULL
      - system : source='system', triggered_by_user_id=NULL, task_name='<celery task>'

    This is the answer to "user_id vs session_id" — every change_log row points
    to a session, and the session tells you who/what performed it.
    """

    __tablename__ = "change_session"

    # 'manual' | 'system'
    source: Mapped[str] = mapped_column(String(16), nullable=False)
    # Set for manual actions; NULL for system/celery runs.
    triggered_by_user_id: Mapped[Optional[int]] = mapped_column(
        Integer,
        ForeignKey("employees.id", ondelete="SET NULL"),
        nullable=True,
    )
    # Set for system runs (e.g. 'loader_employee_event_apply'); NULL for manual.
    task_name: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    # Subject employee the run concerns (single manual actions). NULL for bulk /
    # scheduled sweeps that span many employees. Kept resolvable for the audit UI
    # (employees are not deleted), unlike the event row which a delete removes.
    employee_id: Mapped[Optional[int]] = mapped_column(
        Integer,
        ForeignKey("employees.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    # 'running' | 'success' | 'failed'
    status: Mapped[str] = mapped_column(
        String(16), nullable=False, server_default="running", default="running"
    )
    started_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    finished_at: Mapped[Optional[datetime.datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    # Free-form aggregate run stats, e.g. {"checked": 10, "applied": 7}.
    summary: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)

    triggered_by: Mapped[Optional["Employee"]] = relationship(
        foreign_keys=[triggered_by_user_id],
        lazy="selectin",
    )
    employee: Mapped[Optional["Employee"]] = relationship(
        foreign_keys=[employee_id],
        lazy="selectin",
    )

    def __repr__(self) -> str:
        return (
            f"<ChangeSession(id={self.id}, source='{self.source}', "
            f"status='{self.status}', task_name='{self.task_name}')>"
        )

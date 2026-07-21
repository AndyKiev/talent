import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from backend.api_v1.base.base_model import Base
from backend.api_v1.base.models import IntIdPkMixin, TimestampMixin


class EmployeeDevelopmentVision(IntIdPkMixin, TimestampMixin, Base):
    """
    The employee's OWN statement of how they see their development and which
    missions they would like to take part in — one row per employee.

    Employee-level counterpart of the per-review ``employee_feedback`` field: it
    is not tied to a review session, so it stays valid between reviews. Together
    with per-mission comments this is the employee's write surface, since missions
    themselves are read-only to them.

    Unique on ``employee_id`` — the repository UPSERTS and the API only exposes a
    PUT, so there is never a second row to reconcile. Same 1:1-off-employees shape
    as ``employee_personal_data``.

    ``TimestampMixin`` supplies only ``created_at``, so ``updated_at`` is declared
    explicitly here: on an upsert the row is edited in place, and "when was this
    last revised" is the interesting timestamp.
    """

    __tablename__ = "employee_development_visions"

    employee_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("employees.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
    )
    text: Mapped[str] = mapped_column(Text, nullable=False)
    updated_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )

    def __repr__(self) -> str:
        return (
            f"<EmployeeDevelopmentVision(id={self.id}, "
            f"employee_id={self.employee_id})>"
        )

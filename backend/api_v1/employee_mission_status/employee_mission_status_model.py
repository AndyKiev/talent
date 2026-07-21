# backend/api_v1/employee_mission_status/employee_mission_status_model.py
from typing import TYPE_CHECKING

from sqlalchemy import Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.api_v1.base.base_model import Base
from backend.api_v1.base.models.utils.mixins import IntIdPkMixin, TimestampMixin

if TYPE_CHECKING:
    from backend.api_v1.employee_mission.employee_mission_model import EmployeeMission

# The three keys the auto-computation produces. Rows are seeded, but the table
# is a normal lookup so the DISPLAY name stays translatable/manageable — the
# project rule is that a DB essence is never an enum on the frontend.
PLANNED = "planned"
IN_PROCESS = "in_process"
COMPLETED = "completed"


class EmployeeMissionStatus(IntIdPkMixin, TimestampMixin, Base):
    """
    Lifecycle status of a development mission: planned / in_process / completed.

    DERIVED, never set by hand: the mission's status is recomputed from its KPI
    percentages on every write (see employee_mission_service.compute_status).
    Storing it as a real FK rather than computing it on read keeps it filterable
    and sortable in SQL, and gives the change_log something concrete to record.

    Because it is derived, "reverting" a status is not a status edit — it means
    restoring the KPI progress that produced the earlier status (admin/dev only),
    after which the status recomputes itself. That keeps status and KPIs from
    ever disagreeing.
    """

    __tablename__ = "employee_mission_statuses"

    key: Mapped[str] = mapped_column(String(32), nullable=False, unique=True)
    description: Mapped[str | None] = mapped_column(String(256), nullable=True)
    # Display order for the admin grid (arrow-reorder, per-row PATCH).
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    missions: Mapped[list["EmployeeMission"]] = relationship(
        back_populates="status",
        lazy="noload",
    )

    def __repr__(self) -> str:
        return f"<EmployeeMissionStatus(id={self.id}, key='{self.key}')>"

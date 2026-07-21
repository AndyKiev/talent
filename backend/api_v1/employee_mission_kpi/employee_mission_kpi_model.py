from typing import TYPE_CHECKING

from sqlalchemy import CheckConstraint, ForeignKey, Integer, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.api_v1.base.base_model import Base
from backend.api_v1.base.models import IntIdPkMixin, TimestampMixin

if TYPE_CHECKING:
    from backend.api_v1.employee_mission.employee_mission_model import EmployeeMission


class EmployeeMissionKpi(IntIdPkMixin, TimestampMixin, Base):
    """
    A measurable target under an EmployeeMission. A mission may carry SEVERAL.

    "A mission must keep at least one KPI" cannot be expressed as a DB constraint
    on a child table, so it is a two-sided SERVICE rule: mission-create requires a
    non-empty ``kpis`` list, and deleting the last KPI of a mission is refused.

    ``percent`` is the fulfilment assessment (0-100). Only the employee's oversight
    manager (or admin/dev) may set it — enforced in the service, not here. Every
    change to ``text`` or ``percent`` is written to ``change_log`` under the
    essence key 'employee_mission_kpi', which is where the "who and when" history
    shown to HRM/HRS/admin/dev comes from.

    The max length of ``text`` is the existing app setting ``idp_kpi_max_length``
    (126), enforced in the service — hence a plain Text column, so raising the
    setting needs no migration.
    """

    __tablename__ = "employee_mission_kpis"
    # Bare discriminator: the metadata naming convention prefixes it with
    # `ck_<table>_` already (see the same note on EmployeeMission).
    __table_args__ = (
        CheckConstraint("percent >= 0 AND percent <= 100", name="percent_range"),
    )

    mission_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("employee_missions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    text: Mapped[str] = mapped_column(Text, nullable=False)
    # Fulfilment, in percent. 0 = not yet assessed.
    percent: Mapped[int] = mapped_column(
        Integer, nullable=False, server_default="0", default=0
    )
    # Display order inside the mission (multiples of 10: 10, 20, 30 …).
    sort_order: Mapped[int] = mapped_column(
        Integer, nullable=False, server_default="0", default=0
    )

    mission: Mapped["EmployeeMission"] = relationship(back_populates="kpis")

    def __repr__(self) -> str:
        return (
            f"<EmployeeMissionKpi(id={self.id}, mission_id={self.mission_id}, "
            f"percent={self.percent})>"
        )

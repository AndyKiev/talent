from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, Integer, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.api_v1.base.base_model import Base
from backend.api_v1.base.models import IntIdPkMixin, TimestampMixin

if TYPE_CHECKING:
    from backend.api_v1.employee_mission.employee_mission_model import EmployeeMission


class EmployeeMissionComment(IntIdPkMixin, TimestampMixin, Base):
    """
    A comment written ON a mission. This is the EMPLOYEE's write surface: missions
    themselves are read-only to them (only the oversight manager, or admin/dev,
    may create/edit/delete a mission and set KPI percentages), but an employee may
    comment on their own missions. Admin/dev may CRUD any comment; everyone else
    who can see the mission sees the comments read-only.

    ``author_employee_id`` is NOT the "who last touched it" attribution column
    that ``employee_missions`` deliberately lacks — it is a domain fact (WHOSE
    content this is), always known, and it is what the edit/delete rule keys on.
    Mutation attribution still goes to ``change_log`` under the essence key
    'employee_mission_comment'.
    """

    __tablename__ = "employee_mission_comments"

    mission_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("employee_missions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    author_employee_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("employees.id", ondelete="CASCADE"),
        nullable=False,
    )
    text: Mapped[str] = mapped_column(Text, nullable=False)

    mission: Mapped["EmployeeMission"] = relationship(back_populates="comments")

    def __repr__(self) -> str:
        return (
            f"<EmployeeMissionComment(id={self.id}, mission_id={self.mission_id}, "
            f"author_employee_id={self.author_employee_id})>"
        )

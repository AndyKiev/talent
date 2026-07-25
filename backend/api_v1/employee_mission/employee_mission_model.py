import datetime
from typing import TYPE_CHECKING, Optional

from sqlalchemy import CheckConstraint, Date, ForeignKey, Integer, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.api_v1.base.base_model import Base
from backend.api_v1.base.models import IntIdPkMixin, TimestampMixin

if TYPE_CHECKING:
    from backend.api_v1.employee_mission_comment.employee_mission_comment_model import (
        EmployeeMissionComment,
    )
    from backend.api_v1.employee_mission_dimension_link.employee_mission_dimension_link_model import (
        EmployeeMissionDimensionLink,
    )
    from backend.api_v1.employee_mission_kpi.employee_mission_kpi_model import (
        EmployeeMissionKpi,
    )
    from backend.api_v1.employee_mission_status.employee_mission_status_model import (
        EmployeeMissionStatus,
    )


class EmployeeMission(IntIdPkMixin, TimestampMixin, Base):
    """
    One development mission belonging to an EMPLOYEE (not to a review session).

    Replaces the old ``review_session_employees.development_plan`` JSON column: a
    development plan follows the person, so it stays valid across review sessions
    and is manageable from the employee card as well as from inside a review.

    NO NULLABLE COLUMNS. Two consequences worth knowing:
      * The OPTIONAL competence is not a nullable FK — it is the presence or
        absence of a row in ``employee_mission_dimension_links`` (1:1, both FKs
        CASCADE). See /optional-essence-property.
      * There is no ``created_by`` / ``updated_by`` column. Attribution is the
        audit pattern: ``change_session.triggered_by_user_id`` + ``change_log``
        rows keyed on essence 'employee_mission'.

    The PERIOD (start_date .. end_date) is the stored truth. ``end_date`` is
    computed server-side from the start date plus a duration in months and is
    never accepted from the client; the duration itself is NOT stored, because
    it only ever existed to derive the end date. Display back-calculates it from
    the two dates, so the two representations cannot drift apart.

    The upper bound on that duration is deliberately NOT a CHECK: it comes from
    the app setting ``mission_max_duration_months`` (36), which a developer may
    change — a baked-in constraint would make that setting a lie.

    ``status_id`` is likewise derived (from the KPI percentages) but stored, so
    "planned / in process / completed" can be filtered in SQL and recorded in the
    change trail.
    """

    __tablename__ = "employee_missions"
    # Constraint names are bare discriminators: the metadata naming convention
    # already prefixes them with `ck_<table>_`, so repeating the table here would
    # produce `ck_employee_missions_ck_employee_mission_...`.
    __table_args__ = (
        CheckConstraint("end_date >= start_date", name="end_after_start"),
    )

    employee_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("employees.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    # What the employee is expected to do / develop.
    text: Mapped[str] = mapped_column(Text, nullable=False)
    start_date: Mapped[datetime.date] = mapped_column(Date, nullable=False)
    # The PERIOD is the stored truth. Duration in months used to be stored
    # alongside it, which was redundant — months only ever existed to derive
    # end_date on input. It is now back-calculated from the two dates for
    # display, so the two can never drift apart.
    end_date: Mapped[datetime.date] = mapped_column(Date, nullable=False)
    # Derived from the KPI percentages on every write; never set by hand.
    # RESTRICT (not CASCADE): deleting a status that missions still reference
    # must fail loudly rather than orphan or destroy them.
    status_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("employee_mission_statuses.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )

    # Children. delete-orphan matches the DB-level CASCADE so ORM deletes and raw
    # SQL deletes behave identically.
    kpis: Mapped[list["EmployeeMissionKpi"]] = relationship(
        back_populates="mission",
        lazy="selectin",
        cascade="all, delete-orphan",
        order_by="EmployeeMissionKpi.sort_order, EmployeeMissionKpi.id",
    )
    comments: Mapped[list["EmployeeMissionComment"]] = relationship(
        back_populates="mission",
        lazy="selectin",
        cascade="all, delete-orphan",
    )
    dimension_link: Mapped[Optional["EmployeeMissionDimensionLink"]] = relationship(
        back_populates="mission",
        lazy="selectin",
        uselist=False,
        cascade="all, delete-orphan",
    )
    status: Mapped["EmployeeMissionStatus"] = relationship(
        back_populates="missions",
        lazy="selectin",
    )

    @property
    def dimension_id(self) -> int | None:
        """The linked competence id, or None when the mission has no competence."""
        return self.dimension_link.dimension_id if self.dimension_link else None

    def __repr__(self) -> str:
        return (
            f"<EmployeeMission(id={self.id}, employee_id={self.employee_id}, "
            f"{self.start_date}..{self.end_date})>"
        )

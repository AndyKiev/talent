from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.api_v1.base.base_model import Base
from backend.api_v1.base.models import IntIdPkMixin, TimestampMixin

if TYPE_CHECKING:
    from backend.api_v1.employee_mission.employee_mission_model import EmployeeMission
    from backend.api_v1.review_dimension.review_dimension_model import ReviewDimension


class EmployeeMissionDimensionLink(IntIdPkMixin, TimestampMixin, Base):
    """
    1:1 link between an EmployeeMission and the ReviewDimension (competence) it is
    meant to develop — a mission has AT MOST ONE competence.

    This is how "optional dimension" is modelled WITHOUT a nullable column: no row
    means no competence. Uniqueness is on ``mission_id`` ALONE (not on the pair),
    so a mission can never carry two competences, and editing the competence is an
    upsert (replace), never a blind insert.

    BOTH foreign keys are ``ondelete="CASCADE"``: deleting the mission OR the
    review dimension removes the link row automatically at the DB level — no
    service code needed. This is a deliberate divergence from the plain-FK
    many-to-many link tables and is the core of the /optional-essence-property
    pattern (canonical reference: ``job_job_category_links``).

    Note the asymmetry it buys us: deleting a competence quietly unlinks it from
    every mission, but the missions themselves survive.
    """

    __tablename__ = "employee_mission_dimension_links"

    mission_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("employee_missions.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
    )
    dimension_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("review_dimensions.id", ondelete="CASCADE"),
        nullable=False,
    )

    mission: Mapped["EmployeeMission"] = relationship(back_populates="dimension_link")
    dimension: Mapped["ReviewDimension"] = relationship(lazy="selectin")

    def __repr__(self) -> str:
        return (
            f"<EmployeeMissionDimensionLink(mission_id={self.mission_id}, "
            f"dimension_id={self.dimension_id})>"
        )

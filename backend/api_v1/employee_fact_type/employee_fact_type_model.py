from typing import TYPE_CHECKING

from sqlalchemy import Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.api_v1.base.base_model import Base
from backend.api_v1.base.models import IntIdPkMixin, TimestampMixin

if TYPE_CHECKING:
    from backend.api_v1.employee_fact.employee_fact_model import EmployeeFact

# The two seeded keys. Rows live in the DB so the DISPLAY name stays
# translatable, but these keys are a CODE CONTRACT — resolved by key, never by
# id, so they survive a reseed. Do not rename them.
FACT = "fact"
IMPROVEMENT = "improvement"


class EmployeeFactType(IntIdPkMixin, TimestampMixin, Base):
    """
    What kind of numbered list an employee fact belongs to: a FACT / achievement,
    or a DIRECTION FOR IMPROVEMENT.

    Both were columns of numbered free text on
    `review_session_employee_evaluations` (`facts`, `improvement`). Making the
    kind a row instead of a column name is what lets one table hold both lists,
    and lets a quick-registered fact declare its kind before anyone knows which
    competence it belongs to.

    Why the keys still matter even though the rows are data: which of the two
    lists a fact renders in is code (each side has its own heading, its own
    add-box and its own drop target), and `flip_competence` clears one side by
    key. A third row could be stored, but nothing would know where to draw it —
    which is why there is deliberately no admin CRUD page here, exactly like
    `review_session_employee_dimension_types`.
    """

    __tablename__ = "employee_fact_types"

    key: Mapped[str] = mapped_column(String(32), nullable=False, unique=True)
    description: Mapped[str] = mapped_column(
        String(256), nullable=False, server_default="", default=""
    )
    # Display order of the two lists under a competence.
    sort_order: Mapped[int] = mapped_column(
        Integer, nullable=False, server_default="0", default=0
    )

    facts: Mapped[list["EmployeeFact"]] = relationship(
        back_populates="fact_type",
        lazy="noload",
    )

    def __repr__(self) -> str:
        return f"<EmployeeFactType(id={self.id}, key='{self.key}')>"

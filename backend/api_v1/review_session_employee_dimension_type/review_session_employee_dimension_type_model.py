from typing import TYPE_CHECKING

from sqlalchemy import Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.api_v1.base.base_model import Base
from backend.api_v1.base.models import IntIdPkMixin, TimestampMixin

if TYPE_CHECKING:
    from backend.api_v1.review_session_employee_dimension.review_session_employee_dimension_model import (
        ReviewSessionEmployeeDimension,
    )

# The two seeded keys. Rows live in the DB so the DISPLAY name stays
# translatable, but these keys are a CODE CONTRACT — resolved by key, never by
# id, so they survive a reseed. Do not rename them.
STRONG = "strong"
DEVELOP = "develop"


class ReviewSessionEmployeeDimensionType(IntIdPkMixin, TimestampMixin, Base):
    """
    How one employee's dimension stands in one review: a STRENGTH, or something
    TO DEVELOP.

    This is NOT a catalogue of dimensions — `review_dimensions` is, and it stays
    untouched. Nor is it a property of a dimension: the same dimension is a
    strength for one employee and a development area for another, which is why
    it is only ever reached through `review_session_employee_dimensions`.

    It replaces the two literal keys the old
    `review_session_employees.competence_summary` JSON blob used
    ("strong"/"develop"), so the rows and the wire format are driven by an id
    instead of a field name baked into a schema.

    Why the keys still matter even though the rows are data: the behaviour of a
    side is code. The strong side ranks dimensions by score DESCENDING and the
    to-develop side ASCENDING, and `flip_competence` means "move to the other
    side". A third row could be stored and displayed, but nothing would know how
    to rank it — which is why there is deliberately no admin CRUD page here.
    """

    __tablename__ = "review_session_employee_dimension_types"

    key: Mapped[str] = mapped_column(String(32), nullable=False, unique=True)
    description: Mapped[str] = mapped_column(
        String(256), nullable=False, server_default="", default=""
    )
    # Display order of the two summary sections.
    sort_order: Mapped[int] = mapped_column(
        Integer, nullable=False, server_default="0", default=0
    )

    rse_dimensions: Mapped[list["ReviewSessionEmployeeDimension"]] = relationship(
        back_populates="dimension_type",
        lazy="noload",
    )

    def __repr__(self) -> str:
        return f"<ReviewSessionEmployeeDimensionType(id={self.id}, key='{self.key}')>"

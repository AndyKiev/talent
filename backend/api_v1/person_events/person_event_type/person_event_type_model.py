from typing import TYPE_CHECKING

from sqlalchemy import String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.api_v1.base.base_model import Base
from backend.api_v1.base.models import IntIdPkMixin, TimestampMixin

if TYPE_CHECKING:
    from backend.api_v1.person_events.person_event.person_event_model import PersonEvent

# Seeded type keys. The key is the code contract (see the lookup-key rule);
# `name` is only a label. LAST_NAME_CHANGE is the only one implemented today —
# the others are the reason this is a generic event table and not a
# surname-change table.
LAST_NAME_CHANGE = "LAST_NAME_CHANGE"


class PersonEventType(IntIdPkMixin, TimestampMixin, Base):
    """
    Lookup of things that happen to a PERSON rather than to their employment:
    a surname change on marriage today; death, marriage, birth of a child later.

    Deliberately separate from employee_event_types. An employee event moves a
    job, a department or an employment status and belongs to one employment
    record; a person event changes a fact about the human being, and a human may
    hold several employee records over time.
    """

    __tablename__ = "person_event_types"

    key: Mapped[str] = mapped_column(String(64), nullable=False, unique=True)
    name: Mapped[str] = mapped_column(String(128), nullable=False, unique=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    events: Mapped[list["PersonEvent"]] = relationship(
        back_populates="event_type",
        lazy="selectin",
    )

    def __repr__(self) -> str:
        return f"<PersonEventType(id={self.id}, key='{self.key}')>"

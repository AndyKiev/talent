from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.api_v1.base.base_model import Base
from backend.api_v1.base.models.utils.mixins import IntIdPkMixin, TimestampMixin

if TYPE_CHECKING:
    from backend.api_v1.person_events.person_event.person_event_model import PersonEvent

# field_key values. Free strings by design, exactly like change_log.essence_key:
# a person event changes ONE named field at a time, so a lookup table would buy
# a join and an FK for no constraint the seed does not already give. The only
# rule is that the key names a real Person column.
FIELD_LAST_NAME = "last_name"


class PersonEventChange(IntIdPkMixin, TimestampMixin, Base):
    """
    One field changed by a person event, with both sides recorded.

    `prev_value` is captured when the event is APPLIED, not when it is drafted:
    between drafting and the effective date the current value may still move,
    and the history has to show what was actually replaced.
    """

    __tablename__ = "person_event_changes"

    event_id: Mapped[int] = mapped_column(
        ForeignKey("person_events.id", ondelete="CASCADE"), nullable=False
    )
    field_key: Mapped[str] = mapped_column(String(64), nullable=False)
    prev_value: Mapped[str | None] = mapped_column(Text, nullable=True)
    new_value: Mapped[str | None] = mapped_column(Text, nullable=True)

    event: Mapped[PersonEvent] = relationship(back_populates="changes", lazy="noload")

    def __repr__(self) -> str:
        return f"<PersonEventChange(id={self.id}, field_key='{self.field_key}')>"

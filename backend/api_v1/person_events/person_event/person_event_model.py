from __future__ import annotations

from datetime import date
from typing import TYPE_CHECKING

from sqlalchemy import Date, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.api_v1.base.base_model import Base
from backend.api_v1.base.models.utils.mixins import IntIdPkMixin, TimestampMixin

if TYPE_CHECKING:
    from backend.api_v1.person.person_model import Person
    from backend.api_v1.person_events.person_event_change.person_event_change_model import (
        PersonEventChange,
    )
    from backend.api_v1.person_events.person_event_status.person_event_status_model import (
        PersonEventStatus,
    )
    from backend.api_v1.person_events.person_event_type.person_event_type_model import (
        PersonEventType,
    )


class PersonEvent(IntIdPkMixin, TimestampMixin, Base):
    """
    Something that happened to a person, recorded with the date it took effect.

    `effective_date` is "since when", and it is normally in the PAST: a surname
    change is registered after the fact, once the new document shows up. The
    scheduler applies any `ready` event whose date has arrived, so a future date
    also works without a second code path.

    The values themselves live in `changes` (one row per changed field), so a
    later type that touches two fields — or none, like a death — needs no new
    column here.
    """

    __tablename__ = "person_events"

    person_id: Mapped[int] = mapped_column(
        ForeignKey("persons.id", ondelete="CASCADE"), nullable=False
    )
    event_type_id: Mapped[int] = mapped_column(
        ForeignKey("person_event_types.id"), nullable=False
    )
    status_id: Mapped[int] = mapped_column(
        ForeignKey("person_event_statuses.id"), nullable=False
    )
    effective_date: Mapped[date] = mapped_column(Date, nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_by: Mapped[int | None] = mapped_column(
        ForeignKey("employees.id"), nullable=True
    )

    person: Mapped[Person] = relationship(lazy="noload")
    event_type: Mapped[PersonEventType] = relationship(
        back_populates="events", lazy="selectin"
    )
    status: Mapped[PersonEventStatus] = relationship(
        back_populates="events", lazy="selectin"
    )
    changes: Mapped[list[PersonEventChange]] = relationship(
        back_populates="event",
        lazy="selectin",
        cascade="all, delete-orphan",
    )

    def __repr__(self) -> str:
        return f"<PersonEvent(id={self.id}, person_id={self.person_id})>"

from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.api_v1.base.base_model import Base
from backend.api_v1.base.models.utils.mixins import IntIdPkMixin

if TYPE_CHECKING:
    from backend.api_v1.person_events.person_event.person_event_model import PersonEvent

# Seeded status names. Same three-step lifecycle as an employee event: the row
# is drafted, marked ready, and applied on/after its effective date.
STATUS_DRAFT = "draft"
STATUS_READY = "ready"
STATUS_APPLIED = "applied"


class PersonEventStatus(IntIdPkMixin, Base):
    """Lifecycle of a person_events row: draft -> ready -> applied."""

    __tablename__ = "person_event_statuses"

    name: Mapped[str] = mapped_column(String(32), nullable=False, unique=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    events: Mapped[list[PersonEvent]] = relationship(
        back_populates="status",
        lazy="selectin",
    )

    def __repr__(self) -> str:
        return f"<PersonEventStatus(id={self.id}, name='{self.name}')>"

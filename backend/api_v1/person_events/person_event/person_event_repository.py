from datetime import date

from sqlalchemy import select

from backend.api_v1.base.base_repository import BaseRepository
from backend.api_v1.person_events.person_event.person_event_model import PersonEvent
from backend.api_v1.person_events.person_event_status.person_event_status_model import (
    STATUS_READY,
    PersonEventStatus,
)


class PersonEventRepository(BaseRepository):

    model = PersonEvent

    async def get_for_person(self, person_id: int) -> list[PersonEvent]:
        """A person's history, newest effective date first."""
        stmt = (
            select(self.model)
            .where(self.model.person_id == person_id)
            .order_by(self.model.effective_date.desc(), self.model.id.desc())
        )
        return list((await self.session.scalars(stmt)).all())

    async def get_due_ready_events(
        self, on_or_before: date | None = None
    ) -> list[PersonEvent]:
        """Ready events whose effective date has arrived — the scheduler's input.
        Oldest first, so two changes to the same field land in the right order."""
        cutoff = on_or_before or date.today()
        stmt = (
            select(self.model)
            .join(PersonEventStatus, PersonEventStatus.id == self.model.status_id)
            .where(
                PersonEventStatus.name == STATUS_READY,
                self.model.effective_date <= cutoff,
            )
            .order_by(self.model.effective_date.asc(), self.model.id.asc())
        )
        return list((await self.session.scalars(stmt)).all())

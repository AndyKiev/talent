import datetime
from typing import Sequence

from sqlalchemy import select

from backend.api_v1.base.base_repository import BaseRepository
from backend.api_v1.employee_events.employee_event.employee_event_model import (
    EmployeeEvent,
)
from backend.api_v1.employee_events.employee_event_status.employee_event_status_model import (
    EmployeeEventStatus,
)


class EmployeeEventRepository(BaseRepository):
    model = EmployeeEvent

    async def get_due_ready_events(
        self,
        on_or_before: datetime.date,
        ready_status_name: str = "ready",
    ) -> Sequence[EmployeeEvent]:
        """
        Events whose status is `ready` and whose effective_date is on or before
        `on_or_before`. Ordered by (effective_date, id) so they apply in the
        same chronological order the projection logic expects.

        Joins on the status name so callers do not need to pre-resolve its id.
        """
        stmt = (
            select(EmployeeEvent)
            .join(
                EmployeeEventStatus, EmployeeEvent.status_id == EmployeeEventStatus.id
            )
            .where(EmployeeEventStatus.name == ready_status_name)
            .where(EmployeeEvent.effective_date <= on_or_before)
            .order_by(EmployeeEvent.effective_date.asc(), EmployeeEvent.id.asc())
        )
        result = await self.session.scalars(stmt)
        return result.all()

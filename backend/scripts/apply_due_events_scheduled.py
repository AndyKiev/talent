# backend/scripts/apply_due_events_scheduled.py
"""Scheduled job: apply all due employee events, attributed to the ROBOT admin.

Run (from repo root, e.g. via Windows Task Scheduler / cron):
    python -m backend.scripts.apply_due_events_scheduled

The acting user is the robot system account (see backend/utils/system_actor.py),
so employee_events.created_by / change_sessions.triggered_by_user_id written by
this run point at the robot admin — never at a human.
"""

import asyncio
import datetime
import sys
from pathlib import Path

_repo_root = Path(__file__).resolve().parents[2]
if str(_repo_root) not in sys.path:
    sys.path.insert(0, str(_repo_root))

from backend.api_v1.employee_events.employee_event.employee_event_repository import (
    EmployeeEventRepository,
)
from backend.api_v1.employee_events.employee_event.employee_event_service import (
    EmployeeEventService,
)
from backend.database.db_helper import db_helper
from backend.utils.system_actor import get_system_actor


async def apply_due_events_scheduled() -> None:
    async with db_helper.session_factory() as session:
        actor = await get_system_actor(session)
        print(f"Actor (robot): {actor.code} (id={actor.id})")

        event_service = EmployeeEventService(
            repository=EmployeeEventRepository(session=session),
            user=actor,
            session=session,
        )
        stats = await event_service.apply_due_events(datetime.date.today())

    print(
        f"Applied {stats['applied']}/{stats['checked']} due event(s) "
        f"(failed {stats['failed']})."
    )
    if stats["failures"]:
        for f in stats["failures"]:
            print(
                f"  ! event {f['event_id']} (employee {f['employee_id']}): {f['error']}"
            )


if __name__ == "__main__":
    asyncio.run(apply_due_events_scheduled())

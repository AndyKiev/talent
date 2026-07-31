"""
Seed the person-event lookups: types and statuses.

    python backend/seeds/seed_person_events.py

Idempotent — inserts only what is missing, never rewrites an existing row.
Both lookups are matched by their KEY/NAME, which is a code contract (the
service resolves LAST_NAME_CHANGE and draft/ready/applied by it), so these
tables deliberately have no admin CRUD page.
"""

import asyncio
import sys
from pathlib import Path

_REPO_ROOT = Path(__file__).resolve().parents[2]
if str(_REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(_REPO_ROOT))

from sqlalchemy import select

from backend.api_v1.person_events.person_event_status.person_event_status_model import (
    PersonEventStatus,
)
from backend.api_v1.person_events.person_event_type.person_event_type_model import (
    PersonEventType,
)
from backend.database.db_helper import db_helper

# (key, name, description)
TYPES: list[tuple[str, str, str]] = [
    (
        "LAST_NAME_CHANGE",
        "Last name change",
        "The person's surname changed from a given date (e.g. on marriage). "
        "No reason is recorded.",
    ),
]

# (name, description)
STATUSES: list[tuple[str, str]] = [
    ("draft", "Being filled in; changes nothing yet."),
    ("ready", "Complete; will be applied on its effective date."),
    ("applied", "Projected onto the person record."),
]


async def seed_person_events():
    async with db_helper.session_factory() as session:
        existing_types = {
            k for k in (await session.execute(select(PersonEventType.key))).scalars()
        }
        new_types = 0
        for key, name, description in TYPES:
            if key in existing_types:
                continue
            session.add(PersonEventType(key=key, name=name, description=description))
            new_types += 1

        existing_statuses = {
            n for n in (await session.execute(select(PersonEventStatus.name))).scalars()
        }
        new_statuses = 0
        for name, description in STATUSES:
            if name in existing_statuses:
                continue
            session.add(PersonEventStatus(name=name, description=description))
            new_statuses += 1

        await session.commit()
        print(f"person_event_types:    {new_types} inserted")
        print(f"person_event_statuses: {new_statuses} inserted")
        if not new_types and not new_statuses:
            print("Already seeded — nothing to do.")


if __name__ == "__main__":
    asyncio.run(seed_person_events())

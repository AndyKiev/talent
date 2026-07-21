# backend/seeds/seed_mission_statuses.py
#
# Seeds the three development-mission statuses.
#
# These rows are NOT optional reference data: employee_mission_service resolves
# them BY KEY every time it re-derives a mission's status, and refuses to write
# when a key is missing. The table is a normal lookup essence only so the
# DISPLAYED name stays translatable and orderable — the keys themselves are part
# of the code contract, so do not rename them.
#
# Idempotent: existing keys are left alone.
#
import asyncio
from pathlib import Path
import sys

_REPO_ROOT = Path(__file__).resolve().parents[2]
if str(_REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(_REPO_ROOT))

from sqlalchemy import select

from backend.database.db_helper import db_helper
from backend.api_v1.employee_mission_status.employee_mission_status_model import (
    COMPLETED,
    IN_PROCESS,
    PLANNED,
    EmployeeMissionStatus,
)

STATUSES = [
    (PLANNED, "No KPI progress recorded yet", 10),
    (IN_PROCESS, "At least one KPI has progress", 20),
    (COMPLETED, "Every KPI reached 100%", 30),
]


async def main() -> None:
    async with db_helper.session_factory() as session:
        existing = {
            k for (k,) in await session.execute(select(EmployeeMissionStatus.key))
        }
        added = 0
        for key, description, sort_order in STATUSES:
            if key in existing:
                print(f"  mission status '{key}' already seeded, skipping.")
                continue
            session.add(
                EmployeeMissionStatus(
                    key=key, description=description, sort_order=sort_order
                )
            )
            added += 1
            print(f"  seeded mission status '{key}'")
        await session.commit()
        print(f"done. new statuses: {added}")


if __name__ == "__main__":
    asyncio.run(main())

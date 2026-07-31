# backend/seeds/seed_employee_fact_types.py
#
# Seeds the two kinds of numbered line an employee fact can be.
#
# These rows are NOT optional reference data: the evaluation page splits a
# competence's lines into its two lists by KEY, the quick-registration dialog
# reads the ids from GET /employee_fact_types for its selector, and
# flip_competence clears one side by key. The table is a lookup only so the
# DISPLAYED heading stays translatable — the keys are part of the code contract,
# so do not rename them.
#
# Idempotent: existing keys are left alone.
#
import asyncio
import sys
from pathlib import Path

_REPO_ROOT = Path(__file__).resolve().parents[2]
if str(_REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(_REPO_ROOT))

from sqlalchemy import select

from backend.api_v1.employee_fact_type.employee_fact_type_model import (
    FACT,
    IMPROVEMENT,
    EmployeeFactType,
)
from backend.database.db_helper import db_helper

TYPES = [
    (FACT, "Facts and achievements that prove a competence", 10),
    (IMPROVEMENT, "Directions for improvement of a competence", 20),
]


async def main() -> None:
    async with db_helper.session_factory() as session:
        existing = {k for (k,) in await session.execute(select(EmployeeFactType.key))}
        added = 0
        for key, description, sort_order in TYPES:
            if key in existing:
                print(f"  employee fact type '{key}' already seeded, skipping.")
                continue
            session.add(
                EmployeeFactType(
                    key=key, description=description, sort_order=sort_order
                )
            )
            added += 1
            print(f"  seeded employee fact type '{key}'")
        await session.commit()
        print(f"done. new types: {added}")


if __name__ == "__main__":
    asyncio.run(main())

# backend/seeds/seed_rse_statuses_and_feedback_types.py
#
# Seeds the two review-record lookups that replaced free-text columns:
#
#   review_session_employee_statuses       (open / reviewed / closed)
#   review_session_employee_feedback_types (employee / manager)
#
# Neither is optional reference data. The status keys drive the transition table
# and the editability rule; the feedback-type keys decide who may write which
# box. Both are resolved BY KEY so a reseed (which changes ids) is harmless.
# The tables are lookups only so the DISPLAYED name stays translatable.
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

from backend.api_v1.review_session_employee_feedback_type.review_session_employee_feedback_type_model import (
    EMPLOYEE,
    MANAGER,
    ReviewSessionEmployeeFeedbackType,
)
from backend.api_v1.review_session_employee_status.review_session_employee_status_model import (
    CLOSED,
    OPEN,
    REVIEWED,
    ReviewSessionEmployeeStatus,
)
from backend.database.db_helper import db_helper

# (key, name, description, sort_order)
STATUSES = [
    (OPEN, "Open", "Being filled in", 10),
    (REVIEWED, "Reviewed", "Reviewed, awaiting close", 20),
    (CLOSED, "Closed", "Finalised", 30),
]

FEEDBACK_TYPES = [
    (EMPLOYEE, "Employee feedback", "Written by the employee", 10),
    (MANAGER, "Manager feedback", "Written by the manager", 20),
]


async def _seed(session, model, rows, label: str) -> int:
    existing = {k for (k,) in await session.execute(select(model.key))}
    added = 0
    for key, name, description, sort_order in rows:
        if key in existing:
            print(f"  {label} '{key}' already seeded, skipping.")
            continue
        session.add(
            model(key=key, name=name, description=description, sort_order=sort_order)
        )
        added += 1
        print(f"  seeded {label} '{key}'")
    return added


async def main() -> None:
    async with db_helper.session_factory() as session:
        added = await _seed(
            session, ReviewSessionEmployeeStatus, STATUSES, "review record status"
        )
        added += await _seed(
            session,
            ReviewSessionEmployeeFeedbackType,
            FEEDBACK_TYPES,
            "feedback type",
        )
        await session.commit()
        print(f"done. new rows: {added}")


if __name__ == "__main__":
    asyncio.run(main())

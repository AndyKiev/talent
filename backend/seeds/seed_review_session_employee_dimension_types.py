# backend/seeds/seed_review_session_employee_dimension_types.py
#
# Seeds the two sides of the competence summary.
#
# These rows are NOT optional reference data: the review-summary write path and
# flip_competence both resolve them BY KEY, and the people-review page reads the
# ids from GET /review_session_employee_dimension_types to send its summary. The table is a
# lookup only so the DISPLAYED section heading stays translatable — the keys
# themselves are part of the code contract (the strong side ranks competences
# descending, the to-develop side ascending), so do not rename them.
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
from backend.api_v1.review_session_employee_dimension_type.review_session_employee_dimension_type_model import (
    DEVELOP,
    STRONG,
    ReviewSessionEmployeeDimensionType,
)

TYPES = [
    (STRONG, "Competences the employee is strong in", 10),
    (DEVELOP, "Competences the employee should develop", 20),
]


async def main() -> None:
    async with db_helper.session_factory() as session:
        existing = {
            k
            for (k,) in await session.execute(
                select(ReviewSessionEmployeeDimensionType.key)
            )
        }
        added = 0
        for key, description, sort_order in TYPES:
            if key in existing:
                print(f"  competence summary type '{key}' already seeded, skipping.")
                continue
            session.add(
                ReviewSessionEmployeeDimensionType(
                    key=key, description=description, sort_order=sort_order
                )
            )
            added += 1
            print(f"  seeded competence summary type '{key}'")
        await session.commit()
        print(f"done. new types: {added}")


if __name__ == "__main__":
    asyncio.run(main())

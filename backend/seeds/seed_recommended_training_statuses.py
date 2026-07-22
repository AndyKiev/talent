# backend/seeds/seed_recommended_training_statuses.py
#
# Seeds the recommended-training statuses.
#
# These rows are NOT optional reference data: the service resolves 'recommended'
# BY KEY as the default for every new recommendation and refuses to write when
# it is missing. The table is a lookup only so the DISPLAYED label stays
# translatable and orderable — the keys are part of the code contract.
#
# Deliberately SEPARATE from employee_training_statuses, which belongs to the
# training module: sharing that table would put 'recommended' in the module's
# own status picker, where it means nothing, and would tie two lifecycles that
# are free to diverge. Recommendations must keep working with the training
# module switched off.
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
from backend.api_v1.employee_recommended_training_status.employee_recommended_training_status_model import (
    IN_PROCESS,
    PASSED,
    PLANNED,
    RECOMMENDED,
    EmployeeRecommendedTrainingStatus,
)

# 'recommended' is first and is the DEFAULT every new row starts at; the rest are
# the progression the employee or their oversight manager can move it through.
STATUSES = [
    (RECOMMENDED, "Recommended, not acted on yet", 10),
    (PLANNED, "The employee has scheduled it", 20),
    (IN_PROCESS, "Currently being taken", 30),
    (PASSED, "Completed", 40),
]


async def main() -> None:
    async with db_helper.session_factory() as session:
        existing = {
            k
            for (k,) in await session.execute(
                select(EmployeeRecommendedTrainingStatus.key)
            )
        }
        added = 0
        for key, description, sort_order in STATUSES:
            if key in existing:
                print(
                    f"  recommended training status '{key}' already seeded, skipping."
                )
                continue
            session.add(
                EmployeeRecommendedTrainingStatus(
                    key=key, description=description, sort_order=sort_order
                )
            )
            added += 1
            print(f"  seeded recommended training status '{key}'")
        await session.commit()
        print(f"done. new statuses: {added}")


if __name__ == "__main__":
    asyncio.run(main())

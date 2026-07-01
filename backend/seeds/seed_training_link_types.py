from pathlib import Path
import sys

_REPO_ROOT = Path(__file__).resolve().parents[2]
if str(_REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(_REPO_ROOT))

import asyncio

from sqlalchemy import select

from backend.database.db_helper import db_helper
from backend.api_v1.training_link_type.training_link_type_model import TrainingLinkType


# Code-referenced keys — see TrainingTypeService.get_eligible_for_employee.
TRAINING_LINK_TYPES = [
    {"key": "by_job_category", "description": "Applies to every employee holding a job of a given category"},
    {"key": "by_job", "description": "Applies to employees currently in, or with talent to, a specific job"},
    {"key": "everyone", "description": "Applies to every employee"},
]


async def seed_training_link_types():
    async with db_helper.session_factory() as session:
        for t in TRAINING_LINK_TYPES:
            existing = await session.scalar(
                select(TrainingLinkType).where(TrainingLinkType.key == t["key"])
            )
            if existing:
                print(f"Training link type '{t['key']}' already seeded, skipping.")
                continue
            session.add(TrainingLinkType(**t))
            print(f"Seeded training link type: {t['key']}")
        await session.commit()


if __name__ == "__main__":
    asyncio.run(seed_training_link_types())

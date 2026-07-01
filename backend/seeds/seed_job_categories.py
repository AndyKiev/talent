from pathlib import Path
import sys

_REPO_ROOT = Path(__file__).resolve().parents[2]
if str(_REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(_REPO_ROOT))

import asyncio

from sqlalchemy import select

from backend.database.db_helper import db_helper
from backend.api_v1.job.job_model import Job
from backend.api_v1.job_category.job_category_model import JobCategory
from backend.api_v1.job_job_category_link.job_job_category_link_model import (
    JobJobCategoryLink,
)


# Categories — `key` is snake_case; the UI label is getString(snakeToCamel(key)).
JOB_CATEGORIES = [
    {"key": "manager", "description": "Managerial job category", "sort_order": 10},
    {"key": "employee", "description": "Individual-contributor job category", "sort_order": 20},
]

# Default applied to every existing job during backfill (point 5).
DEFAULT_KEY = "manager"


async def seed_job_categories():
    async with db_helper.session_factory() as session:
        # 1) Seed the categories (insert missing only — idempotent).
        for c in JOB_CATEGORIES:
            existing = await session.scalar(
                select(JobCategory).where(JobCategory.key == c["key"])
            )
            if existing:
                print(f"Job category '{c['key']}' already seeded, skipping.")
                continue
            session.add(JobCategory(**c))
            print(f"Seeded job category: {c['key']}")
        await session.flush()

        # 2) Backfill: every job WITHOUT a category link gets the default one.
        manager_id = await session.scalar(
            select(JobCategory.id).where(JobCategory.key == DEFAULT_KEY)
        )
        if manager_id is None:
            print(f"Default category '{DEFAULT_KEY}' missing — backfill skipped.")
            await session.commit()
            return

        job_ids = set((await session.scalars(select(Job.id))).all())
        linked_job_ids = set(
            (await session.scalars(select(JobJobCategoryLink.job_id))).all()
        )

        created = 0
        for job_id in job_ids - linked_job_ids:
            session.add(
                JobJobCategoryLink(job_id=job_id, job_category_id=manager_id)
            )
            created += 1

        await session.commit()
        print(f"Backfilled {created} job(s) with default category '{DEFAULT_KEY}'.")


if __name__ == "__main__":
    asyncio.run(seed_job_categories())

"""
Find jobs that have NO department_type link and remove all their
job_job_group_link rows (unlink them from job groups).

Run from the repo root:
    cd backend && poetry run python scripts/unlink_orphan_jobs_from_groups.py

Or with dry-run:
    cd backend && poetry run python scripts/unlink_orphan_jobs_from_groups.py --dry-run
"""

import asyncio
import sys
from pathlib import Path

# Ensure the backend package is importable from the repo root
REPO_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO_ROOT))

from sqlalchemy import select, delete

from backend.database.db_helper import db_helper
from backend.api_v1.job.job_model import Job
from backend.api_v1.department_type_job_link.department_type_job_link_model import (
    DepartmentTypeJobLink,
)
from backend.api_v1.job_job_group_link.job_job_group_link_model import JobJobGroupLink


async def main(dry_run: bool = False):
    async with db_helper.session_factory() as session:
        # 1. Get all job IDs that have at least one department_type link
        linked_result = await session.execute(
            select(DepartmentTypeJobLink.job_id).distinct()
        )
        linked_job_ids = {row[0] for row in linked_result.fetchall()}
        print(f"Jobs with department_type link: {len(linked_job_ids)}")

        # 2. Get all jobs
        all_jobs_result = await session.execute(select(Job.id, Job.name))
        all_jobs = {row[0]: row[1] for row in all_jobs_result.fetchall()}
        print(f"Total jobs: {len(all_jobs)}")

        # 3. Find orphan jobs (no department_type link)
        orphan_job_ids = set(all_jobs.keys()) - linked_job_ids
        print(f"Jobs WITHOUT department_type link: {len(orphan_job_ids)}")

        if not orphan_job_ids:
            print("Nothing to do.")
            return

        # Show the orphan jobs
        print("\nOrphan jobs (no department_type link):")
        for jid in sorted(orphan_job_ids):
            print(f"  id={jid}  name={all_jobs[jid]}")

        # 4. Find job_job_group_links for these orphan jobs
        links_result = await session.execute(
            select(JobJobGroupLink).where(
                JobJobGroupLink.job_id.in_(orphan_job_ids)
            )
        )
        links = links_result.scalars().all()
        print(f"\nJob-group links to remove: {len(links)}")
        for link in links:
            print(
                f"  link_id={link.id}  job_id={link.job_id}  "
                f"job_name={all_jobs[link.job_id]}  job_group_id={link.job_group_id}"
            )

        if not links:
            print("No job-group links to remove.")
            return

        if dry_run:
            print("\n[DRY RUN] Would delete these links. Run without --dry-run to execute.")
            return

        # 5. Delete the links
        link_ids = [link.id for link in links]
        await session.execute(
            delete(JobJobGroupLink).where(JobJobGroupLink.id.in_(link_ids))
        )
        await session.commit()
        print(f"\nDeleted {len(link_ids)} job_job_group_link rows.")


if __name__ == "__main__":
    dry_run = "--dry-run" in sys.argv
    asyncio.run(main(dry_run=dry_run))

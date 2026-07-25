"""
Delete jobs that have NO department_type link.

Before deleting:
  - Collect and save the `key` values of deleted jobs to a file
    (backend/scripts/saved_keys.json) so they can be reused.
  - Null out employee.job_id for any employees referencing these jobs.
  - Delete any remaining link rows (job_user_group_link,
    job_job_group_link — the latter should already be gone).

Run from the repo root:
    cd backend && poetry run python scripts/delete_unlinked_jobs.py

Or with dry-run:
    cd backend && poetry run python scripts/delete_unlinked_jobs.py --dry-run
"""

import asyncio
import json
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO_ROOT))

from backend.api_v1.department_type_job_link.department_type_job_link_model import (
    DepartmentTypeJobLink,
)
from backend.api_v1.employee.employee_model import Employee
from backend.api_v1.job.job_model import Job
from backend.api_v1.job_job_group_link.job_job_group_link_model import JobJobGroupLink
from backend.api_v1.table_relationship_links.job_user_group_link_model import (
    JobUserGroupLink,
)
from backend.database.db_helper import db_helper
from sqlalchemy import delete, select, update

SAVED_KEYS_PATH = Path(__file__).resolve().parent / "saved_keys.json"


async def main(dry_run: bool = False):
    async with db_helper.session_factory() as session:
        # ── 1. Find orphan jobs (no department_type link) ──
        linked_result = await session.execute(
            select(DepartmentTypeJobLink.job_id).distinct()
        )
        linked_ids = {row[0] for row in linked_result.fetchall()}

        all_result = await session.execute(select(Job.id, Job.name, Job.key))
        all_jobs = {row[0]: (row[1], row[2]) for row in all_result.fetchall()}

        orphan_ids = set(all_jobs.keys()) - linked_ids
        if not orphan_ids:
            print("No orphan jobs found. Nothing to do.")
            return

        orphan_jobs = sorted(orphan_ids, key=lambda jid: jid)
        print(f"Orphan jobs (no department_type link): {len(orphan_jobs)}")

        # ── 2. Save their keys ──
        keys_to_save = {}
        for jid in orphan_jobs:
            name, key = all_jobs[jid]
            print(f"  id={jid:>4}  name={name}  key={key}")
            if key:
                keys_to_save[str(jid)] = key

        # ── 3. Collect ALL keys (including NULL) for full record ──
        all_keys = {
            str(jid): {"name": all_jobs[jid][0], "key": all_jobs[jid][1]}
            for jid in orphan_jobs
        }

        if not dry_run:
            SAVED_KEYS_PATH.write_text(
                json.dumps(all_keys, indent=2, ensure_ascii=False),
                encoding="utf-8",
            )
            print(f"\nSaved keys to {SAVED_KEYS_PATH}")
        else:
            print(f"\n[DRY RUN] Would save keys to {SAVED_KEYS_PATH}")

        reusable = [k for k in keys_to_save.values()]
        if reusable:
            print(f"Reusable snake_case keys ({len(reusable)}): {reusable}")
        else:
            print("No snake_case keys to reuse (all were NULL).")

        if dry_run:
            print("\n[DRY RUN] Would delete these jobs. Run without --dry-run to execute.")
            # Still print what would happen
            await _dry_run_details(session, orphan_ids, all_jobs)
            return

        # ── 4. Null out employee.job_id for these jobs ──
        emp_count_result = await session.execute(
            select(Employee).where(Employee.job_id.in_(orphan_ids))
        )
        affected_employees = emp_count_result.scalars().all()
        if affected_employees:
            await session.execute(
                update(Employee)
                .where(Employee.job_id.in_(orphan_ids))
                .values(job_id=None)
            )
            print(f"\nNulled job_id for {len(affected_employees)} employees.")
        else:
            print("\nNo employees referencing these jobs.")

        # ── 5. Delete job_user_group_link rows ──
        ug_links = await session.execute(
            select(JobUserGroupLink).where(JobUserGroupLink.job_id.in_(orphan_ids))
        )
        ug_links_list = ug_links.scalars().all()
        if ug_links_list:
            await session.execute(
                delete(JobUserGroupLink).where(
                    JobUserGroupLink.job_id.in_(orphan_ids)
                )
            )
            print(f"Deleted {len(ug_links_list)} job_user_group_link rows.")

        # ── 6. Delete job_job_group_link rows (safety, should be 0) ──
        jg_links = await session.execute(
            select(JobJobGroupLink).where(JobJobGroupLink.job_id.in_(orphan_ids))
        )
        jg_links_list = jg_links.scalars().all()
        if jg_links_list:
            await session.execute(
                delete(JobJobGroupLink).where(
                    JobJobGroupLink.job_id.in_(orphan_ids)
                )
            )
            print(f"Deleted {len(jg_links_list)} remaining job_job_group_link rows.")

        # ── 7. Delete the jobs ──
        await session.execute(delete(Job).where(Job.id.in_(orphan_ids)))
        await session.commit()
        print(f"\nDeleted {len(orphan_jobs)} jobs.")


async def _dry_run_details(session, orphan_ids, all_jobs):
    # Employees
    emp_result = await session.execute(
        select(Employee).where(Employee.job_id.in_(orphan_ids))
    )
    employees = emp_result.scalars().all()
    if employees:
        print(f"  Would null job_id for {len(employees)} employees:")
        for e in employees:
            print(f"    employee id={e.id} code={e.code} name={e.name}")
    else:
        print("  No employees referencing these jobs.")

    # job_user_group_link
    ug_result = await session.execute(
        select(JobUserGroupLink).where(JobUserGroupLink.job_id.in_(orphan_ids))
    )
    ug = ug_result.scalars().all()
    if ug:
        print(f"  Would delete {len(ug)} job_user_group_link rows.")

    # job_job_group_link
    jg_result = await session.execute(
        select(JobJobGroupLink).where(JobJobGroupLink.job_id.in_(orphan_ids))
    )
    jg = jg_result.scalars().all()
    if jg:
        print(f"  Would delete {len(jg)} job_job_group_link rows.")


if __name__ == "__main__":
    dry_run = "--dry-run" in sys.argv
    asyncio.run(main(dry_run=dry_run))

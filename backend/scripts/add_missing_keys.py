"""
Fill missing (NULL) `key` values on jobs that ARE linked to department_type,
using snake_case keys reclaimed from deleted orphan jobs.

Reads saved keys from backend/scripts/saved_keys.json (written by
delete_unlinked_jobs.py). Assigns them to linked jobs with NULL key,
first-come first-served.

Run from the repo root:
    cd backend && poetry run python scripts/add_missing_keys.py

Or with dry-run:
    cd backend && poetry run python scripts/add_missing_keys.py --dry-run
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
from backend.api_v1.job.job_model import Job
from backend.database.db_helper import db_helper
from sqlalchemy import select, update

SAVED_KEYS_PATH = Path(__file__).resolve().parent / "saved_keys.json"


async def main(dry_run: bool = False):
    # ── 1. Load the saved keys ──
    if not SAVED_KEYS_PATH.exists():
        print(f"ERROR: {SAVED_KEYS_PATH} not found. Run delete_unlinked_jobs.py first.")
        return

    saved_data = json.loads(SAVED_KEYS_PATH.read_text(encoding="utf-8"))
    # Only keep non-null keys
    reclaimed_keys = [
        entry["key"]
        for entry in saved_data.values()
        if entry["key"] is not None
    ]
    if not reclaimed_keys:
        print("No snake_case keys to reuse (all deleted jobs had NULL keys).")
        return

    print(f"Reclaimed keys from deleted jobs ({len(reclaimed_keys)}): {reclaimed_keys}")

    async with db_helper.session_factory() as session:
        # ── 2. Find linked jobs with NULL key ──
        linked_result = await session.execute(
            select(DepartmentTypeJobLink.job_id).distinct()
        )
        linked_ids = {row[0] for row in linked_result.fetchall()}

        if not linked_ids:
            print("No linked jobs at all.")
            return

        # Fetch linked jobs that have NULL key
        jobs_result = await session.execute(
            select(Job.id, Job.name, Job.key)
            .where(Job.id.in_(linked_ids), Job.key.is_(None))
            .order_by(Job.id)
        )
        null_key_jobs = [(row[0], row[1]) for row in jobs_result.fetchall()]

        if not null_key_jobs:
            print("All linked jobs already have keys. Nothing to do.")
            return

        print(f"\nLinked jobs with NULL key: {len(null_key_jobs)}")
        for jid, name in null_key_jobs:
            print(f"  id={jid:>4}  name={name}  key=NULL")

        if len(null_key_jobs) > len(reclaimed_keys):
            print(
                f"\nWARNING: {len(null_key_jobs)} jobs need keys but only "
                f"{len(reclaimed_keys)} reclaimed keys available. "
                f"Only the first {len(reclaimed_keys)} jobs will get keys."
            )

        # ── 3. Assign keys (first N where N = min(null_jobs, reclaimed)) ──
        assignments = list(zip(null_key_jobs, reclaimed_keys))
        for (jid, name), key in assignments:
            print(f"\n  Assign:  id={jid:>4}  name={name}  →  key=\"{key}\"")

        if dry_run:
            print("\n[DRY RUN] Would update these jobs. Run without --dry-run to execute.")
            return

        for (jid, _), key in assignments:
            await session.execute(
                update(Job).where(Job.id == jid).values(key=key)
            )

        await session.commit()
        print(f"\nUpdated {len(assignments)} job keys.")


if __name__ == "__main__":
    dry_run = "--dry-run" in sys.argv
    asyncio.run(main(dry_run=dry_run))

# backend/scripts/migrate_evaluation_facts.py
#
# Step 2 of THREE for moving the two numbered text columns off
# review_session_employee_evaluations:
#
#   1) revision  — create employee_fact_types / employee_facts /
#                  employee_fact_evaluation_links
#   2) THIS SCRIPT — copy every numbered line out of `facts` / `improvement`
#                    into rows, linked back to the evaluation it came from
#   3) revision  — drop `facts`, `improvement`
#
# Never two revisions: with the create and the drop in one upgrade, every value
# in a populated database would be destroyed before it had somewhere to go.
#
# Run it AFTER `seed_employee_fact_types.py` and BEFORE the drop revision:
#
#   cd backend
#   .venv/Scripts/python.exe -m backend.scripts.migrate_evaluation_facts --dry-run
#   .venv/Scripts/python.exe -m backend.scripts.migrate_evaluation_facts
#
# Idempotent: an evaluation that already has linked facts is skipped, so a
# re-run after a partial failure never duplicates lines.
#
# Attribution: the rows are NOT NULL on created_by_id / updated_by_id, and the
# old text carried no author at all. Everything migrated is attributed to the
# ROBOT system actor (employee code 'ADMIN'), falling back to the lowest
# employee id when no robot account exists — the point is that the columns hold
# a real, traceable employee, not that the value is meaningful for old data.
import argparse
import asyncio
import re
import sys
from pathlib import Path

_REPO_ROOT = Path(__file__).resolve().parents[2]
if str(_REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(_REPO_ROOT))

from sqlalchemy import select, text

from backend.api_v1.employee.employee_model import Employee
from backend.api_v1.employee_fact_type.employee_fact_type_model import (
    FACT,
    IMPROVEMENT,
    EmployeeFactType,
)
from backend.database.db_helper import db_helper
from backend.utils.system_actor import SYSTEM_ACTOR_CODE

# Strips the stored "1. " / "2) " prefix — the numbering is derived from
# sort_order now, so it must not survive into the text.
_NUMBER_PREFIX = re.compile(r"^\s*\d+[.)]\s*")


def parse_lines(raw: str | None) -> list[str]:
    if not raw:
        return []
    out = []
    for line in raw.split("\n"):
        cleaned = _NUMBER_PREFIX.sub("", line).strip()
        if cleaned:
            out.append(cleaned)
    return out


async def resolve_actor_id(session) -> int:
    actor_id = await session.scalar(
        select(Employee.id).where(Employee.code == SYSTEM_ACTOR_CODE)
    )
    if actor_id is None:
        actor_id = await session.scalar(select(Employee.id).order_by(Employee.id))
    if actor_id is None:
        raise RuntimeError("No employees in the database — nothing to attribute to.")
    return actor_id


async def main(dry_run: bool) -> None:
    async with db_helper.session_factory() as session:
        type_ids = {
            key: tid
            for tid, key in (
                await session.execute(select(EmployeeFactType.id, EmployeeFactType.key))
            ).all()
        }
        for key in (FACT, IMPROVEMENT):
            if key not in type_ids:
                raise RuntimeError(
                    f"employee_fact_types is missing '{key}' — "
                    f"run backend/seeds/seed_employee_fact_types.py first."
                )

        actor_id = await resolve_actor_id(session)

        # Column-only read straight off the tables: the ORM model no longer
        # declares `facts` / `improvement` (they are being dropped), and the
        # evaluation entity would selectin the whole review graph anyway.
        rows = (
            await session.execute(
                text(
                    """
                    SELECT e.id, e.facts, e.improvement, e.created_at,
                           rse.employee_id
                    FROM review_session_employee_evaluations e
                    JOIN review_session_employees rse
                      ON rse.id = e.review_session_employee_id
                    WHERE COALESCE(e.facts, '') <> ''
                       OR COALESCE(e.improvement, '') <> ''
                    ORDER BY e.id
                    """
                )
            )
        ).all()

        already = {
            eval_id
            for (eval_id,) in (
                await session.execute(
                    text(
                        "SELECT DISTINCT review_session_employee_evaluation_id "
                        "FROM employee_fact_evaluation_links"
                    )
                )
            ).all()
        }

        made_facts = 0
        made_links = 0
        skipped = 0
        for row in rows:
            if row.id in already:
                skipped += 1
                continue
            for column, key in ((row.facts, FACT), (row.improvement, IMPROVEMENT)):
                for index, line in enumerate(parse_lines(column)):
                    made_facts += 1
                    made_links += 1
                    if dry_run:
                        continue
                    fact_id = await session.scalar(
                        text(
                            """
                            INSERT INTO employee_facts
                                (employee_id, employee_fact_type_id, text,
                                 created_by_id, updated_by_id,
                                 created_at, updated_at)
                            VALUES
                                (:employee_id, :type_id, :text,
                                 :actor_id, :actor_id, :created_at, :created_at)
                            RETURNING id
                            """
                        ),
                        {
                            "employee_id": row.employee_id,
                            "type_id": type_ids[key],
                            "text": line,
                            "actor_id": actor_id,
                            "created_at": row.created_at,
                        },
                    )
                    await session.execute(
                        text(
                            """
                            INSERT INTO employee_fact_evaluation_links
                                (employee_fact_id,
                                 review_session_employee_evaluation_id,
                                 sort_order, created_at)
                            VALUES (:fact_id, :eval_id, :sort_order, :created_at)
                            """
                        ),
                        {
                            "fact_id": fact_id,
                            "eval_id": row.id,
                            "sort_order": index,
                            "created_at": row.created_at,
                        },
                    )

        if dry_run:
            await session.rollback()
        else:
            await session.commit()

        mode = "[DRY-RUN] would create" if dry_run else "created"
        print(
            f"evaluations with text: {len(rows)} (skipped, already migrated: {skipped})"
        )
        print(f"{mode} {made_facts} employee_facts and {made_links} links")
        print(f"attributed to employee id {actor_id}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    asyncio.run(main(args.dry_run))

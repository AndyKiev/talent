# backend/scripts/migrate_development_plans.py
#
# ONE-SHOT data move: review_session_employees.development_plan (JSON blob)
# -> the employee-scoped employee_missions / _kpis / _dimension_links tables.
#
# Run it BETWEEN the two Alembic revisions:
#   1. revision that CREATES the mission tables
#   2. this script  (--dry-run first, then for real, then re-run to prove no-op)
#   3. revision that DROPS review_session_employees.development_plan
#
# Deliberately a standalone script rather than logic inside the revision:
# Alembic runs a SYNC connection while every rule this move must honour lives in
# async service code (>=1 KPI per mission, end_date computation, change_log
# attribution). Re-implementing those as raw SQL inside a revision would be
# unreviewable and untestable in isolation.
#
# Usage (from the repo root, venv active):
#   python -m backend.scripts.migrate_development_plans --dry-run
#   python -m backend.scripts.migrate_development_plans
#
# Idempotent: an employee who already has any mission row is skipped, so a second
# run creates nothing.
import argparse
import asyncio
import datetime
import json
import random
import sys
from pathlib import Path

_REPO_ROOT = Path(__file__).resolve().parents[2]
if str(_REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(_REPO_ROOT))

from dotenv import load_dotenv

load_dotenv()

from sqlalchemy import func, select, text

from backend.api_v1.audit.change_log.change_log_model import ChangeLog
from backend.api_v1.audit.change_session.change_session_model import ChangeSession
from backend.api_v1.employee_mission.employee_mission_model import EmployeeMission
from backend.api_v1.employee_mission.employee_mission_service import compute_end_date
from backend.api_v1.employee_mission_dimension_link.employee_mission_dimension_link_model import (
    EmployeeMissionDimensionLink,
)
from backend.api_v1.employee_mission_kpi.employee_mission_kpi_model import (
    EmployeeMissionKpi,
)
from backend.api_v1.review_dimension.review_dimension_model import ReviewDimension
from backend.database.db_helper import db_helper
from backend.utils.system_actor import get_system_actor

TASK_NAME = "migrate_development_plans"
# Missions carried over have no recorded period. A year from the source review
# record's date is the common development horizon and keeps them "running"
# rather than silently arriving already expired.
DEFAULT_DURATION_MONTHS = 12

# Generated KPI text for migrated missions, which predate the KPI field.
#
# Ukrainian on purpose. CLAUDE.md's "never hardcode non-English text" governs UI
# strings resolved through getString and backend message fallbacks; this is row
# DATA, displayed verbatim next to the mission's own Ukrainian text, exactly like
# the invented Ukrainian names in /seed-employees. An English KPI beside a
# Ukrainian mission would look broken to every user.
KPI_BANK = [
    "Пройти щонайменше два навчальні курси за напрямом.",
    "Отримати позитивний відгук керівника за підсумками періоду.",
    "Взяти участь щонайменше в одному крос-функціональному проєкті.",
    "Провести не менше трьох робочих сесій із командою.",
    "Підготувати підсумкову презентацію результатів розвитку.",
    "Досягти узгоджених із керівником показників за напрямом.",
    "Застосувати набуті навички щонайменше у двох робочих задачах.",
    "Отримати зворотний зв'язок від колег за підсумками періоду.",
    "Скласти та виконати індивідуальний план навчання.",
    "Наставляти щонайменше одного колегу протягом періоду.",
]


def parse_plan(raw):
    """Same tolerant parse the old album helper used: accepts the legacy shape
    (a JSON array of plain strings) AND the newer {text, kpi, dimension_key}."""
    if not raw:
        return []
    try:
        arr = json.loads(raw)
    except (ValueError, TypeError):
        arr = [raw]
    if not isinstance(arr, list):
        return []

    out = []
    for item in arr:
        if isinstance(item, dict):
            item_text = str(item.get("text") or "").strip()
            kpi = str(item.get("kpi") or "").strip()
            key = item.get("dimension_key")
        else:
            item_text = str(item or "").strip()
            kpi = ""
            key = None
        if item_text:
            out.append(
                {
                    "text": item_text,
                    "kpi": kpi,
                    "dimension_key": str(key) if key else None,
                }
            )
    return out


async def latest_plans(session):
    """The LAST review record per employee that carries a non-empty plan.

    Raw SQL because the ORM model no longer maps `development_plan` — the column
    is on its way out, and this script is the only thing that still reads it.
    DISTINCT ON keeps one row per employee, newest first.
    """
    rows = (
        await session.execute(
            text(
                """
                select distinct on (rse.employee_id)
                       rse.employee_id,
                       rse.id            as rse_id,
                       rse.development_plan,
                       rs.period_start
                from review_session_employees rse
                join review_sessions rs on rs.id = rse.session_id
                where rse.development_plan is not null
                  and btrim(rse.development_plan) <> ''
                  and rse.development_plan <> '[]'
                order by rse.employee_id, rse.created_at desc, rse.id desc
                """
            )
        )
    ).all()
    return rows


async def dimension_key_map(session):
    """lower(key) -> id. The JSON stored lowercase keys ('people_planet') while
    review_dimensions stores them uppercase ('PEOPLE_PLANET'), so the match must
    be case-insensitive or every mission would lose its competence."""
    rows = (
        await session.execute(select(ReviewDimension.id, ReviewDimension.key))
    ).all()
    return {str(key).lower(): dim_id for dim_id, key in rows if key}


async def run(dry_run: bool) -> None:
    async with db_helper.session_factory() as session:
        dim_map = await dimension_key_map(session)
        rows = await latest_plans(session)

        stats = {
            "employees": 0,
            "missions": 0,
            "kpis": 0,
            "generated_kpis": 0,
            "unresolved_dimensions": 0,
            "skipped_existing": 0,
        }

        if dry_run:
            print("DRY RUN — nothing will be written.\n")
        print(f"{len(rows)} employee(s) with a non-empty development_plan.\n")

        actor = None
        run_row = None
        if not dry_run:
            actor = await get_system_actor(session)
            run_row = ChangeSession(
                source="system",
                triggered_by_user_id=None,
                task_name=TASK_NAME,
                status="running",
            )
            session.add(run_row)
            # Persist the run BEFORE the loop so a later failure cannot erase the
            # record that it happened.
            await session.commit()
            print(f"change_session id={run_row.id} (actor: {actor.code})\n")

        for employee_id, rse_id, raw_plan, period_start in rows:
            existing = await session.scalar(
                select(func.count())
                .select_from(EmployeeMission)
                .where(EmployeeMission.employee_id == employee_id)
            )
            if existing:
                stats["skipped_existing"] += 1
                print(f"employee {employee_id}: already has missions — skipped")
                continue

            plan = parse_plan(raw_plan)
            if not plan:
                continue

            start_date = period_start or datetime.date.today()
            stats["employees"] += 1
            print(f"employee {employee_id} (from rse {rse_id}): {len(plan)} mission(s)")

            for entry in plan:
                dim_id = None
                if entry["dimension_key"]:
                    dim_id = dim_map.get(entry["dimension_key"].lower())
                    if dim_id is None:
                        stats["unresolved_dimensions"] += 1
                        print(f"    ! unresolved competence {entry['dimension_key']!r}")

                kpi_text = entry["kpi"]
                if not kpi_text:
                    kpi_text = random.choice(KPI_BANK)
                    stats["generated_kpis"] += 1

                stats["missions"] += 1
                stats["kpis"] += 1
                if dry_run:
                    continue

                mission = EmployeeMission(
                    employee_id=employee_id,
                    text=entry["text"],
                    start_date=start_date,
                    duration_months=DEFAULT_DURATION_MONTHS,
                    end_date=compute_end_date(start_date, DEFAULT_DURATION_MONTHS),
                )
                session.add(mission)
                await session.flush()

                kpi = EmployeeMissionKpi(
                    mission_id=mission.id, text=kpi_text, percent=0, sort_order=10
                )
                session.add(kpi)
                if dim_id is not None:
                    session.add(
                        EmployeeMissionDimensionLink(
                            mission_id=mission.id, dimension_id=dim_id
                        )
                    )
                await session.flush()

                session.add(
                    ChangeLog(
                        change_session_id=run_row.id,
                        essence_key="employee_mission",
                        entity_id=mission.id,
                        action="create",
                        employee_id=employee_id,
                        changes={
                            "text": {"old": None, "new": mission.text},
                            "start_date": {"old": None, "new": str(mission.start_date)},
                            "end_date": {"old": None, "new": str(mission.end_date)},
                            "dimension_id": {"old": None, "new": dim_id},
                            "migrated_from_rse_id": {"old": None, "new": rse_id},
                        },
                    )
                )
                session.add(
                    ChangeLog(
                        change_session_id=run_row.id,
                        essence_key="employee_mission_kpi",
                        entity_id=kpi.id,
                        action="create",
                        employee_id=employee_id,
                        changes={"text": {"old": None, "new": kpi.text}},
                    )
                )

        if not dry_run:
            run_row.status = "success"
            run_row.finished_at = datetime.datetime.now(datetime.timezone.utc)
            run_row.summary = stats
            await session.commit()

        print("\n--- summary ---")
        for key, value in stats.items():
            print(f"  {key}: {value}")
        if dry_run:
            print("\nDRY RUN — re-run without --dry-run to apply.")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Report what would be created without writing anything.",
    )
    args = parser.parse_args()
    asyncio.run(run(args.dry_run))


if __name__ == "__main__":
    main()

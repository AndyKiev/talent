"""
Seed: backfill the persons table from existing employees (person rollout).

Order:
    poetry run alembic upgrade head              # migration 1 (persons + person_id, nullable)
    python -m backend.seeds.seed_person_from_employees   # THIS (fills data)
    <flip model nullability, autogenerate migration 2>
    poetry run alembic upgrade head              # migration 2 (NOT NULL)

What it does (idempotent — only employees WHERE person_id IS NULL):
  - Splits employees.name as LAST FIRST [PATRONYMIC], normalizes each part to
    title-case (О'КОННОР -> О'Коннор, МАРІЯ-АННА -> Марія-Анна).
  - Assigns name_dedupe_no per (last, first) group for namesakes.
  - Sets employees.person_id; does NOT rewrite employees.name.
    (Historical note: during the original rollout this also copied birth_date
    and sex from employee_personal_data; those legacy columns are dropped now —
    sex/marital_status/birth_date live on persons only.)
  - Prints a report of unparseable names (single-token/empty -> first_name
    NULL). These MUST be fixed manually before migration 2 (NOT NULL) runs.

Run from anywhere (repo root is added to sys.path).
"""

import asyncio
import sys
from pathlib import Path

_repo_root = Path(__file__).resolve().parents[2]
if str(_repo_root) not in sys.path:
    sys.path.insert(0, str(_repo_root))

from sqlalchemy import select

from backend.database.db_helper import db_helper
from backend.api_v1.employee.employee_model import Employee
from backend.api_v1.person.person_model import Person
from backend.utils.person_names import split_employee_full_name, normalize_name_part


async def seed_person_from_employees() -> None:
    async with db_helper.session_factory() as session:
        employees = (
            (
                await session.execute(
                    select(Employee)
                    .where(Employee.person_id.is_(None))
                    .order_by(Employee.id)
                    .execution_options(populate_existing=True)
                )
            )
            .scalars()
            .all()
        )
        if not employees:
            print("Nothing to do: every employee already has a person.")
            return

        # Existing persons count per normalized (last, first) — dedupe baseline.
        existing_persons = (await session.execute(select(Person))).scalars().all()
        dedupe_next: dict[tuple[str, str], int] = {}
        for p in existing_persons:
            key = ((p.last_name or "").lower(), (p.first_name or "").lower())
            dedupe_next[key] = max(dedupe_next.get(key, 0), p.name_dedupe_no + 1)

        created = 0
        unparseable: list[tuple[str, str]] = []

        for employee in employees:
            last_raw, first_raw, patronymic_raw = split_employee_full_name(
                employee.name
            )
            last = normalize_name_part(last_raw)
            first = normalize_name_part(first_raw)
            patronymic = normalize_name_part(patronymic_raw)
            if not last or not first:
                unparseable.append((employee.code, employee.name))

            key = ((last or "").lower(), (first or "").lower())
            dedupe_no = dedupe_next.get(key, 0)
            dedupe_next[key] = dedupe_no + 1

            person = Person(
                first_name=first,
                last_name=last,
                patronymic=patronymic,
                name_dedupe_no=dedupe_no,
            )
            session.add(person)
            await session.flush()
            employee.person_id = person.id
            created += 1

        await session.commit()

        print(f"Created {created} persons; linked employees.person_id.")
        if unparseable:
            print(
                f"\nWARNING: {len(unparseable)} unparseable names "
                f"(first_name/last_name NULL) — fix BEFORE migration 2:"
            )
            for code, name in unparseable:
                print(f"  {code}: '{name}'")
        else:
            print("All names parsed cleanly — safe to apply migration 2.")


if __name__ == "__main__":
    asyncio.run(seed_person_from_employees())

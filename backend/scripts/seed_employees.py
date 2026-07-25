"""Seed one employee per (active department, linked job), descending the whole
department TREE, then activate each via a real activation event.

What it does
------------
Picks a set of ROOT departments, then walks DOWN the tree into every active
descendant (children, grandchildren, ...). For each active department in that
subtree it reads the department's active TYPE, takes every ACTIVE job linked to
that type (``department_type_job_links``), and — if no employee already holds
that job as their MAIN department in that exact department — creates one:

  * code   ``UKR`` + 7 digits, starting ``UKR0000001`` (next free number),
  * name   an invented Ukrainian full name,
  * email  ``<first-initial><surname>@auchan.ua`` (transliterated, e.g.
           Наталія Вітренко -> ``nvitrenko@auchan.ua``), de-duplicated,
  * a MAIN department link (employee_departments row) to that department,
  * an ACTIVATION event (random past ``effective_date``) with MAIN_DEPT_CHANGE +
    JOB_CHANGE + auto STATUS_CHANGE -> working.

After creating all of them it runs ``apply_due_events(today)`` so every overdue
activation is applied and each employee becomes ``working`` (active).

Roots
-----
  * Default (no ``--departments``): every ACTIVE department whose category is
    ``directorate`` or ``store`` (the directorates + the hypermarkets).
  * ``--departments``: an explicit comma-separated list of department NAMES or
    IDs to use as roots, e.g. ``--departments "Почайна,Біличі"`` or
    ``--departments "11,12"``.

Recursion is ON by default ("move down the tree"); pass ``--no-recurse`` to seed
only the root departments themselves.

Reuses the real services (``EmployeeService.create_user`` +
``EmployeeEventService.create_activation_for_employee`` / ``apply_due_events``)
so the seeded data is identical to ``POST /employees/with_activation``.

Idempotent: a (department, job) that already has an employee is skipped, so
re-running only fills the gaps. The admin (``UKR7101004``) is never created or
touched.

Examples
--------
    # full directorate + hypermarket tree (default)
    python -m backend.scripts.seed_employees
    # only two hypermarkets and everything under them
    python -m backend.scripts.seed_employees --departments "Почайна,Біличі"
    # preview what would be created, no writes
    python -m backend.scripts.seed_employees -d "11,12" --dry-run
"""

import argparse
import asyncio
import datetime
import os
import random
import re
import sys

# Make the repo root importable so `backend...` resolves regardless of CWD.
sys.path.insert(
    0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
)

from backend.api_v1.employee.employee_repository import EmployeeRepository
from backend.api_v1.employee.employee_schema import EmployeeCreate
from backend.api_v1.employee.employee_service import EmployeeService
from backend.api_v1.employee_events.employee_event.employee_event_repository import (
    EmployeeEventRepository,
)
from backend.api_v1.employee_events.employee_event.employee_event_service import (
    EmployeeEventService,
)
from backend.database.db_helper import db_helper
from sqlalchemy import text

# ── Config ────────────────────────────────────────────────────────────────────
ADMIN_CODE = "UKR7101004"  # the real admin (me) — never created or deleted
# Default roots when --departments is not given: directorate + hypermarket stores.
SCOPE_CATEGORY_KEYS = ("directorate", "store")
EMAIL_DOMAIN = "auchan.ua"
LANG_ID = 3  # Ukrainian (employees model default)
SEED = 42  # deterministic name pairing / dates within a run

# ── Ukrainian -> Latin transliteration (KMU-2010, simplified) ─────────────────
_TRANSLIT = {
    "а": "a", "б": "b", "в": "v", "г": "h", "ґ": "g", "д": "d", "е": "e",
    "є": "ie", "ж": "zh", "з": "z", "и": "y", "і": "i", "ї": "i", "й": "i",
    "к": "k", "л": "l", "м": "m", "н": "n", "о": "o", "п": "p", "р": "r",
    "с": "s", "т": "t", "у": "u", "ф": "f", "х": "kh", "ц": "ts", "ч": "ch",
    "ш": "sh", "щ": "shch", "ь": "", "ю": "iu", "я": "ia", "'": "", "’": "",
}


def translit(word: str) -> str:
    """Transliterate a Ukrainian word to lowercase Latin [a-z]."""
    out = [_TRANSLIT.get(ch, ch) for ch in word.lower()]
    return re.sub(r"[^a-z]", "", "".join(out))


# ── Invented Ukrainian name pools (paired pseudo-randomly) ────────────────────
FIRST_NAMES = [
    "Наталія", "Олександр", "Ірина", "Андрій", "Оксана", "Сергій", "Катерина",
    "Дмитро", "Марія", "Володимир", "Тетяна", "Микола", "Юлія", "Олег",
    "Світлана", "Ігор", "Людмила", "Василь", "Анна", "Павло", "Галина",
    "Роман", "Вікторія", "Богдан", "Ольга", "Максим", "Лариса", "Віктор",
    "Надія", "Юрій", "Дарина", "Тарас", "Інна", "Артем", "Алла", "Назар",
    "Софія", "Степан", "Валентина", "Денис",
]
SURNAMES = [
    "Вітренко", "Коваленко", "Бондаренко", "Шевченко", "Ткаченко", "Кравчук",
    "Мельник", "Поліщук", "Бойко", "Лисенко", "Гуменюк", "Савченко",
    "Руденко", "Марченко", "Петренко", "Гнатюк", "Захарченко", "Левченко",
    "Павленко", "Кравченко", "Сидоренко", "Демченко", "Карпенко",
    "Морозенко", "Романюк", "Гончар", "Дорошенко", "Мороз", "Кравець",
    "Тимошенко", "Семенюк", "Іваненко", "Федоренко", "Дяченко", "Зінченко",
    "Якименко", "Соколенко", "Ковальчук", "Литвин", "Олійник",
]


def build_name_pool(count: int) -> list[str]:
    """`count` invented 'First Surname' Ukrainian names (duplicates allowed — the
    DB enforces uniqueness only on code/email, which are de-duplicated separately)."""
    rng = random.Random(SEED)
    firsts = FIRST_NAMES[:]
    surs = SURNAMES[:]
    rng.shuffle(firsts)
    rng.shuffle(surs)
    f, s = len(firsts), len(surs)
    return [f"{firsts[i % f]} {surs[(i // f) % s]}" for i in range(count)]


def random_activation_date() -> datetime.date:
    """A random past date (3 years .. 30 days ago) so the activation is overdue."""
    today = datetime.date.today()
    return today - datetime.timedelta(days=random.randint(30, 365 * 3))


async def resolve_root_ids(session, departments_arg: list[str] | None) -> list[int]:
    """Resolve the ROOT department ids.

    departments_arg None  -> active departments in SCOPE_CATEGORY_KEYS.
    departments_arg list  -> tokens that are digits = ids; others = names
                             (active, case-insensitive exact match). Raises if a
                             named department is missing/inactive.
    """
    if not departments_arg:
        rows = (
            await session.execute(
                text(
                    "SELECT d.id FROM departments d "
                    "JOIN department_categories dc ON dc.id = d.department_category_id "
                    "WHERE d.is_active = TRUE AND dc.key = ANY(:keys)"
                ),
                {"keys": list(SCOPE_CATEGORY_KEYS)},
            )
        ).scalars().all()
        return list(rows)

    tokens = [t.strip() for t in departments_arg if t.strip()]
    ids = {int(t) for t in tokens if t.isdigit()}
    names = [t for t in tokens if not t.isdigit()]
    if names:
        rows = (
            await session.execute(
                text(
                    "SELECT id, name FROM departments "
                    "WHERE is_active = TRUE AND lower(name) = ANY(:names)"
                ),
                {"names": [n.lower() for n in names]},
            )
        ).all()
        found = {r._mapping["name"].lower(): r._mapping["id"] for r in rows}
        for n in names:
            if n.lower() not in found:
                raise SystemExit(f"Department not found or inactive: '{n}'")
            ids.add(found[n.lower()])
    return sorted(ids)


async def fetch_pairs(session, root_ids: list[int], recurse: bool) -> list[dict]:
    """(dept_id, dept_name, job_id, job_name, cat_key) pairs that still need an
    employee — descending the subtree of `root_ids` when `recurse` is True."""
    recursive_term = (
        " UNION ALL "
        "SELECT c.id, c.department_type_id FROM departments c "
        "JOIN subtree s ON c.parent_id = s.id WHERE c.is_active = TRUE"
        if recurse
        else ""
    )
    sql = text(
        f"""
        WITH RECURSIVE subtree AS (
            SELECT id, department_type_id
            FROM departments
            WHERE id = ANY(:root_ids) AND is_active = TRUE
            {recursive_term}
        )
        SELECT st.id AS dept_id, d.name AS dept_name,
               l.job_id AS job_id, j.name AS job_name,
               dc.key AS cat_key
        FROM subtree st
        JOIN departments d ON d.id = st.id
        JOIN department_categories dc ON dc.id = d.department_category_id
        JOIN department_types dt ON dt.id = st.department_type_id AND dt.is_active = TRUE
        JOIN department_type_job_links l
             ON l.department_type_id = dt.id AND l.is_active = TRUE
        JOIN jobs j ON j.id = l.job_id
        WHERE NOT EXISTS (
            SELECT 1 FROM employee_departments ed
            JOIN employees e ON e.id = ed.employee_id
            WHERE ed.department_id = st.id
              AND e.job_id = l.job_id
        )
        ORDER BY dc.key, st.id, l.job_id
        """
    )
    rows = (await session.execute(sql, {"root_ids": root_ids})).all()
    return [dict(r._mapping) for r in rows]


async def existing_state(session) -> tuple[set[int], set[str]]:
    """(used UKR code numbers, used lowercase emails) currently in the DB."""
    codes = (
        await session.execute(text("SELECT code FROM employees WHERE code ~ '^UKR[0-9]{7}$'"))
    ).scalars().all()
    emails = (
        await session.execute(text("SELECT lower(email) FROM employees WHERE email IS NOT NULL"))
    ).scalars().all()
    return {int(c[3:]) for c in codes}, set(emails)


def next_code(used_nums: set[int], counter: list[int]) -> str:
    n = counter[0]
    while n in used_nums:
        n += 1
    used_nums.add(n)
    counter[0] = n + 1
    return f"UKR{n:07d}"


def make_email(full_name: str, used_emails: set[str]) -> str:
    parts = full_name.split()
    first, surname = parts[0], parts[-1]
    local = (translit(first)[:1] + translit(surname)) or "user"
    candidate = f"{local}@{EMAIL_DOMAIN}"
    i = 2
    while candidate.lower() in used_emails:
        candidate = f"{local}{i}@{EMAIL_DOMAIN}"
        i += 1
    used_emails.add(candidate.lower())
    return candidate


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Seed employees down the department tree.")
    p.add_argument(
        "-d", "--departments", default=None,
        help="Comma-separated root department NAMES or IDs "
             "(default: all active directorate + store departments).",
    )
    p.add_argument(
        "--no-recurse", action="store_true",
        help="Seed only the root departments, do not descend into children.",
    )
    p.add_argument(
        "--dry-run", action="store_true",
        help="Print the (department, job) slots that would be filled; create nothing.",
    )
    return p.parse_args(argv)


async def main(argv: list[str] | None = None) -> None:
    args = parse_args(argv)
    departments_arg = args.departments.split(",") if args.departments else None
    recurse = not args.no_recurse
    random.seed(SEED)
    created = 0

    async with db_helper.session_factory() as session:
        root_ids = await resolve_root_ids(session, departments_arg)
        if not root_ids:
            print("No root departments resolved — nothing to do.")
            return
        scope = "tree (recursive)" if recurse else "roots only"
        print(f"Roots: {len(root_ids)} department(s) {root_ids} | scope: {scope}")

        pairs = await fetch_pairs(session, root_ids, recurse)
        if not pairs:
            print("Nothing to seed — every (department, job) in scope already has an employee.")
            return
        print(f"Found {len(pairs)} (department, job) slot(s) to fill.")

        if args.dry_run:
            for p in pairs:
                print(f"  · dept {p['dept_id']} '{p['dept_name']}' / job {p['job_id']} "
                      f"'{p['job_name']}' [{p['cat_key']}]")
            print(f"\nDRY RUN — would create {len(pairs)} employee(s). No changes made.")
            return

        boot = EmployeeService(repository=EmployeeRepository(session=session), session=session)
        admin = await boot.get_by_code(ADMIN_CODE)
        print(f"Actor (created_by): {admin.code} (id={admin.id})")

        employee_service = EmployeeService(
            repository=EmployeeRepository(session=session), user=admin, session=session
        )
        event_service = EmployeeEventService(
            repository=EmployeeEventRepository(session=session), user=admin, session=session
        )

        used_nums, used_emails = await existing_state(session)
        names = build_name_pool(len(pairs))
        counter = [1]

        for idx, pair in enumerate(pairs):
            full_name = names[idx]
            code = next_code(used_nums, counter)
            email = make_email(full_name, used_emails)

            employee = await employee_service.create_user(
                EmployeeCreate(
                    code=code, name=full_name, email=email, is_active=True, lang_id=LANG_ID
                )
            )
            await event_service.create_activation_for_employee(
                employee_id=employee.id,
                effective_date=random_activation_date(),
                department_id=pair["dept_id"],
                job_id=pair["job_id"],
                description="Seeded employee (auto activation)",
            )
            created += 1
            print(
                f"  + {code} {email:32} -> dept {pair['dept_id']} / job {pair['job_id']} "
                f"[{pair['cat_key']}]"
            )

        stats = await event_service.apply_due_events(datetime.date.today())

    print(
        f"\nSeed complete: created {created} employee(s); "
        f"activations applied {stats['applied']}/{stats['checked']} (failed {stats['failed']})."
    )
    if stats["failures"]:
        print("Activation failures:")
        for f in stats["failures"]:
            print(f"  ! event {f['event_id']} (employee {f['employee_id']}): {f['error']}")


if __name__ == "__main__":
    asyncio.run(main())

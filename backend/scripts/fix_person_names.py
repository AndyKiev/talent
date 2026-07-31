# backend/scripts/fix_person_names.py
"""Repair person name fields: put the given name and surname in the right
columns, set sex to match the given name, and give the demo employees distinct
surnames.

    python -m backend.scripts.fix_person_names --dry-run
    python -m backend.scripts.fix_person_names

Why this exists: the demo data was seeded from the old `employees.name` string,
which held "First Surname" but was parsed as "LAST FIRST". The surname therefore
landed in `persons.first_name` for ~70 rows, sex was never derived from the name
at all (so it is effectively random), and the whole roster shared two surnames.

Three fixes, in this order:

1. **Order** — if `last_name` holds a known given name and `first_name` does
   not, the two are swapped.
2. **Sex** — taken from the patronymic when there is one (`-ович/-йович` male,
   `-івна/-ївна` female; it is the strongest signal because it is grammatical,
   not a lookup), else from the given name.
3. **Surname variety** — every demo employee (code `UKR0000NN`) gets a distinct
   surname from the pool below, inflected for sex where the surname inflects.

Runs through the ORM, never raw SQL, for two reasons: the name columns are
encrypted (raw UPDATEs would write plaintext into a column believed encrypted),
and `persons.name_hash` is maintained by a mapper event that only fires on ORM
flush. Both would be silently wrong otherwise.

Real people are not renamed — only their order and sex are corrected. Only the
seeded `UKR0000NN` range gets a new surname.
"""

import argparse
import asyncio
import re
import sys
from pathlib import Path

_REPO_ROOT = Path(__file__).resolve().parents[2]
if str(_REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(_REPO_ROOT))

from sqlalchemy import select

from backend.api_v1.employee.employee_model import Employee
from backend.api_v1.person.person_model import Person
from backend.api_v1.sex.sex_model import FEMALE_SEX_ID, MALE_SEX_ID
from backend.database.db_helper import db_helper
from backend.utils.person_names import (
    UKRAINIAN_GIVEN_NAMES as GIVEN_NAMES,
)
from backend.utils.person_names import sex_from_given_name, sex_from_patronymic

SEX_ID_BY_WORD = {"male": MALE_SEX_ID, "female": FEMALE_SEX_ID}


def sex_id_for(given_name: str | None, patronymic: str | None) -> int | None:
    """Patronymic first (grammatical), then the given name."""
    word = sex_from_patronymic(patronymic) or sex_from_given_name(given_name)
    return SEX_ID_BY_WORD.get(word) if word else None


# ── Surname pool ──────────────────────────────────────────────────────────────
# Deliberately dominated by INVARIANT surnames (-ко / -ук / -юк / -чук / -ник /
# -ар), which do not inflect for sex — that is genuinely typical in Ukrainian and
# it removes any chance of handing a woman a masculine surname. The gendered
# ones at the end carry both forms explicitly.
INVARIANT_SURNAMES = [
    "Шевченко",
    "Коваленко",
    "Бондаренко",
    "Ткаченко",
    "Кравченко",
    "Мельник",
    "Шевчук",
    "Бойко",
    "Ковальчук",
    "Кравчук",
    "Олійник",
    "Марченко",
    "Савченко",
    "Руденко",
    "Мороз",
    "Лисенко",
    "Гриценко",
    "Данилюк",
    "Мазур",
    "Костенко",
    "Литвин",
    "Демченко",
    "Сидоренко",
    "Романюк",
    "Панасюк",
    "Левченко",
    "Мартиненко",
    "Науменко",
    "Тарасенко",
    "Кириленко",
    "Онищенко",
    "Пилипенко",
    "Радченко",
    "Семененко",
    "Тимошенко",
    "Федоренко",
    "Харченко",
    "Гончаренко",
    "Дорошенко",
    "Іваненко",
    "Клименко",
    "Луценко",
    "Макаренко",
    "Нестеренко",
    "Опанасенко",
    "Приходько",
    "Романенко",
    "Сергієнко",
    "Ткачук",
    "Українець",
    "Филипенко",
    "Хоменко",
    "Черненко",
    "Юрченко",
    "Яценко",
    "Бондарчук",
    "Ващенко",
    "Гаврилюк",
    "Дяченко",
    "Захарчук",
    "Іванчук",
    "Карпенко",
    "Лещенко",
    "Максименко",
    "Мироненко",
    "Назаренко",
    "Овчаренко",
    "Павленко",
    "Поліщук",
    "Проценко",
    "Рибак",
    "Сорока",
    "Стельмах",
    "Троценко",
    "Устименко",
    "Хмара",
    "Цимбалюк",
    "Чорновіл",
    "Шульга",
    "Щербак",
    "Юрчук",
    "Ярошенко",
    "Андрущенко",
    "Бабенко",
    "Василенко",
    "Герасименко",
    "Дмитренко",
    "Жук",
    "Зінченко",
]
# (male form, female form)
GENDERED_SURNAMES = [
    ("Ковальський", "Ковальська"),
    ("Вишневський", "Вишневська"),
    ("Заболотний", "Заболотна"),
    ("Білий", "Біла"),
    ("Чорний", "Чорна"),
    ("Підлісний", "Підлісна"),
    ("Зелений", "Зелена"),
    ("Кучерявий", "Кучерява"),
]

# Seeded demo employees are UKR + a 7-digit number zero-padded from 1..72, i.e.
# five leading zeros. Real accounts (UKR7101004, UKR9991001, ...) never match,
# so they keep their surnames.
DEMO_CODE = re.compile(r"^UKR0{5}\d{2}$")


def build_surname_pool() -> list:
    """Each entry is (male_form, female_form); invariant surnames repeat the
    same string for both."""
    pool = [(s, s) for s in INVARIANT_SURNAMES]
    pool.extend(GENDERED_SURNAMES)
    return pool


async def main(dry_run: bool) -> int:
    pool = build_surname_pool()
    async with db_helper.session_factory() as session:
        code_by_person = {
            e.person_id: e.code
            for e in (await session.execute(select(Employee))).scalars()
        }
        persons = (
            (await session.execute(select(Person).order_by(Person.id))).scalars().all()
        )

        # Surnames already in use by people we are NOT renaming — so a generated
        # surname can never collide with a real one.
        keep_surnames = {
            p.last_name
            for p in persons
            if not DEMO_CODE.match(code_by_person.get(p.id, "") or "")
        }
        available = [pair for pair in pool if pair[0] not in keep_surnames]

        swapped = resexed = renamed = 0
        unknown: list[str] = []
        pool_i = 0

        for person in persons:
            code = code_by_person.get(person.id, "") or ""
            first, last = person.first_name, person.last_name

            # 1) Order — swap only when the evidence is unambiguous: the LAST
            #    field is a known given name and the FIRST field is not.
            if last in GIVEN_NAMES and first not in GIVEN_NAMES:
                person.first_name, person.last_name = last, first
                swapped += 1
            first, last = person.first_name, person.last_name

            # 2) Sex — patronymic wins, then the given name.
            sex = sex_id_for(first, person.patronymic)
            if sex is None:
                unknown.append(f"{person.id} {code} {first} {last}")
            elif person.sex_id != sex:
                person.sex_id = sex
                resexed += 1

            # 3) Distinct surname for the seeded demo range only.
            if DEMO_CODE.match(code):
                if pool_i >= len(available):
                    print("[ERR] surname pool exhausted — add more surnames")
                    return 1
                male_form, female_form = available[pool_i]
                pool_i += 1
                person.last_name = (
                    female_form if person.sex_id == FEMALE_SEX_ID else male_form
                )
                person.name_dedupe_no = 0
                renamed += 1

        print(f"swapped first/last : {swapped}")
        print(f"sex corrected      : {resexed}")
        print(f"surnames reassigned: {renamed}")
        if unknown:
            print(f"\nsex NOT determined for {len(unknown)} row(s) — left as is:")
            for u in unknown:
                print(f"  {u}")

        if dry_run:
            await session.rollback()
            print("\nDRY RUN — nothing written.")
            return 0

        await session.commit()
        print("\nCommitted. name_hash re-synced by the Person mapper event.")
        return 0


if __name__ == "__main__":
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--dry-run", action="store_true", help="show, change nothing")
    args = ap.parse_args()
    raise SystemExit(asyncio.run(main(args.dry_run)))

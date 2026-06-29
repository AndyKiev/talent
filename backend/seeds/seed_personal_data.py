"""
Seeder: populate personal data for every employee in the last review session
(except UKR7101004).

For each employee it:
  1. Personal data: birth date, hire date, marital status, sex
  2. Education: 1-2 Ukrainian institutions (university + optional college)
  3. Foreign languages: 1-2 languages with CEFR levels
  4. Children: 0-2 children with birth dates

All sections are idempotent — skips data that already exists.

Run:
    cd backend && poetry run python seeds/seed_personal_data.py
"""

import asyncio
import random
import sys
from datetime import date, timedelta
from pathlib import Path

_REPO_ROOT = Path(__file__).resolve().parents[2]
if str(_REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(_REPO_ROOT))

from sqlalchemy import select, desc

from backend.database.db_helper import db_helper
from backend.api_v1.review_session.review_session_model import ReviewSession
from backend.api_v1.review_session_employee.review_session_employee_model import (
    ReviewSessionEmployee,
)
from backend.api_v1.employee.employee_model import Employee
from backend.api_v1.table_relationship_links.employee_personal_data_model import (
    EmployeePersonalData,
)
from backend.api_v1.employee_education.employee_education_model import EmployeeEducation
from backend.api_v1.education_degree.education_degree_model import EducationDegree
from backend.api_v1.employee_language_profile.employee_language_profile_model import (
    EmployeeLanguageProfile,
)
from backend.api_v1.employee_language.employee_language_model import EmployeeLanguage
from backend.api_v1.language_level.language_level_model import LanguageLevel
from backend.api_v1.employee_child.employee_child_model import EmployeeChild

# ═══════════════════════════════════════════════════════════════════════════════
# Data banks
# ═══════════════════════════════════════════════════════════════════════════════

_INSTITUTIONS: list[dict] = [
    {"name": "Національний технічний університет України «Київський політехнічний інститут імені Ігоря Сікорського»", "speciality": "Комп'ютерні науки"},
    {"name": "Київський національний університет імені Тараса Шевченка", "speciality": "Прикладна математика"},
    {"name": "Національний університет «Києво-Могилянська академія»", "speciality": "Фінанси"},
    {"name": "Київський національний економічний університет імені Вадима Гетьмана", "speciality": "Менеджмент"},
    {"name": "Національний авіаційний університет", "speciality": "Системна інженерія"},
    {"name": "Національний університет біоресурсів і природокористування України", "speciality": "Екологія"},
    {"name": "Харківський національний університет радіоелектроніки", "speciality": "Телекомунікації"},
    {"name": "Львівський національний університет імені Івана Франка", "speciality": "Право"},
    {"name": "Одеський національний політехнічний університет", "speciality": "Машинобудування"},
    {"name": "Дніпровський національний університет імені Олеся Гончара", "speciality": "Фізика"},
]

_COLLEGES: list[dict] = [
    {"name": "Київський фаховий коледж зв'язку", "speciality": "Телекомунікації та радіотехніка"},
    {"name": "Київський фаховий коледж електронних приладів", "speciality": "Електроніка"},
    {"name": "Львівський фаховий коледж харчової промисловості", "speciality": "Харчові технології"},
    {"name": "Харківський фаховий коледж будівництва та архітектури", "speciality": "Будівництво"},
    {"name": "Одеський фаховий коледж економіки та права", "speciality": "Бухгалтерський облік"},
    {"name": "Київський фаховий коледж туризму та готельного господарства", "speciality": "Готельно-ресторанна справа"},
    {"name": "Дніпровський фаховий коледж транспорту", "speciality": "Транспортні технології"},
]

# Language keys must match the frontend FOREIGN_LANGUAGES constant
# (english / french). The display label comes from getString(labelKey).
_LANGUAGES: list[dict] = [
    {"language": "english", "level_code": "B1"},
    {"language": "english", "level_code": "B2"},
    {"language": "english", "level_code": "A2"},
    {"language": "french",  "level_code": "A1"},
    {"language": "french",  "level_code": "A2"},
]

# ═══════════════════════════════════════════════════════════════════════════════
# Helpers
# ═══════════════════════════════════════════════════════════════════════════════


def _random_date(start: date, end: date) -> date:
    delta = (end - start).days
    return start + timedelta(days=random.randint(0, delta))


# ═══════════════════════════════════════════════════════════════════════════════
# Section: Personal Data
# ═══════════════════════════════════════════════════════════════════════════════


async def _seed_personal_data(session, emp: Employee):
    result = await session.execute(
        select(EmployeePersonalData).where(
            EmployeePersonalData.employee_id == emp.id
        )
    )
    if result.scalar_one_or_none() is not None:
        print(f"   ⏭️  personal_data — already exists, skipping.")
        return

    sex = random.choice(["male", "female"])
    marital = random.choice(["married", "not_married"])
    birth = _random_date(date(1975, 1, 1), date(2000, 12, 31))
    hire_start = max(birth + timedelta(days=20 * 365), date(2005, 1, 1))
    hire = _random_date(hire_start, date(2024, 12, 31))

    pd_row = EmployeePersonalData(
        employee_id=emp.id,
        birth_date=birth,
        hire_date=hire,
        marital_status=marital,
        sex=sex,
    )
    session.add(pd_row)
    print(f"   👤 personal_data: {sex}, {marital}, born {birth}, hired {hire}")


# ═══════════════════════════════════════════════════════════════════════════════
# Section: Education
# ═══════════════════════════════════════════════════════════════════════════════


async def _seed_education(session, emp: Employee, degree_map: dict[str, int]):
    result = await session.execute(
        select(EmployeeEducation).where(EmployeeEducation.employee_id == emp.id)
    )
    if list(result.scalars().all()):
        print(f"   ⏭️  education — already exists, skipping.")
        return

    uni = random.choice(_INSTITUTIONS)
    degree_id = degree_map.get("bachelor")
    grad_year = random.randint(1995, 2020)
    edu1 = EmployeeEducation(
        employee_id=emp.id,
        institution=uni["name"],
        degree_id=degree_id,
        speciality=uni["speciality"],
        graduation_year=grad_year,
    )
    session.add(edu1)
    print(f"   🎓 education: {uni['name']} ({uni['speciality']}, {grad_year})")

    if random.random() < 0.4:
        col = random.choice(_COLLEGES)
        degree_id2 = degree_map.get("junior_specialist")
        grad_year2 = grad_year - random.randint(2, 4)
        edu2 = EmployeeEducation(
            employee_id=emp.id,
            institution=col["name"],
            degree_id=degree_id2,
            speciality=col["speciality"],
            graduation_year=grad_year2,
        )
        session.add(edu2)
        print(f"   🎓 education (college): {col['name']} ({col['speciality']}, {grad_year2})")


# ═══════════════════════════════════════════════════════════════════════════════
# Section: Languages
# ═══════════════════════════════════════════════════════════════════════════════


async def _seed_languages(session, emp: Employee, level_by_code: dict[str, int]):
    result = await session.execute(
        select(EmployeeLanguageProfile).where(
            EmployeeLanguageProfile.employee_id == emp.id
        )
    )
    existing_profile = result.scalar_one_or_none()

    if existing_profile is not None and existing_profile.languages:
        print(f"   ⏭️  languages — already exist, skipping.")
        return

    if existing_profile is None:
        profile = EmployeeLanguageProfile(employee_id=emp.id)
        session.add(profile)
        await session.flush()
    else:
        profile = existing_profile

    count = random.randint(1, 2)
    seen_langs: set[str] = set()
    for _ in range(count):
        lang = random.choice(_LANGUAGES)
        if lang["language"] in seen_langs:
            continue
        seen_langs.add(lang["language"])
        level_id = level_by_code.get(lang["level_code"])
        el = EmployeeLanguage(
            profile_id=profile.id,
            language=lang["language"],
            level_id=level_id,
        )
        session.add(el)
        print(f"   🌐 language: {lang['language']} ({lang['level_code']})")


# ═══════════════════════════════════════════════════════════════════════════════
# Section: Children
# ═══════════════════════════════════════════════════════════════════════════════


async def _seed_children(session, emp: Employee):
    result = await session.execute(
        select(EmployeeChild).where(EmployeeChild.employee_id == emp.id)
    )
    if list(result.scalars().all()):
        print(f"   ⏭️  children — already exist, skipping.")
        return

    count = random.choices([0, 1, 2], weights=[30, 40, 30])[0]
    for _ in range(count):
        birth = _random_date(date(2005, 1, 1), date(2025, 12, 31))
        child = EmployeeChild(employee_id=emp.id, birth_date=birth)
        session.add(child)
        print(f"   👶 child born {birth}")


# ═══════════════════════════════════════════════════════════════════════════════
# Main
# ═══════════════════════════════════════════════════════════════════════════════


async def seed_personal_data():
    async with db_helper.session_factory() as session:
        # ── 1. Last review session ──────────────────────────────────────────
        result = await session.execute(
            select(ReviewSession).order_by(desc(ReviewSession.id)).limit(1)
        )
        session_obj = result.scalar_one_or_none()
        if not session_obj:
            print("❌ No review session found — seed aborted.")
            return
        print(f"📋 Session: {session_obj.name} (id={session_obj.id})")

        # ── 2. Excluded employee ────────────────────────────────────────────
        result = await session.execute(
            select(Employee).where(Employee.code == "UKR7101004")
        )
        excluded_emp = result.scalar_one_or_none()
        excluded_id = excluded_emp.id if excluded_emp else None
        if excluded_emp:
            print(f"🚫 Excluding: {excluded_emp.name} ({excluded_emp.code})")

        # ── 3. Get distinct employee IDs in the session ─────────────────────
        result = await session.execute(
            select(ReviewSessionEmployee.employee_id)
            .where(ReviewSessionEmployee.session_id == session_obj.id)
            .distinct()
        )
        emp_ids = [row[0] for row in result.all()]
        if excluded_id is not None and excluded_id in emp_ids:
            emp_ids.remove(excluded_id)
        print(f"👥 {len(emp_ids)} unique employees to seed.")

        if not emp_ids:
            print("⚠️ No employees to seed.")
            return

        # ── 4. Load employees ───────────────────────────────────────────────
        result = await session.execute(
            select(Employee).where(Employee.id.in_(emp_ids))
        )
        employees: list[Employee] = list(result.scalars().all())
        employees.sort(key=lambda e: e.name or "")

        # ── 5. Lookup: education degrees ────────────────────────────────────
        result = await session.execute(select(EducationDegree))
        degrees = list(result.scalars().all())
        degree_map: dict[str, int] = {}
        for d in degrees:
            key = (d.name_key or "").lower()
            if "bachelor" in key or "bakalavr" in key:
                degree_map["bachelor"] = d.id
            elif "master" in key or "magistr" in key:
                degree_map["master"] = d.id
            elif "specialist" in key or "spetsialist" in key:
                degree_map["specialist"] = d.id
            elif "junior" in key or "molodsh" in key or "fakhov" in key:
                degree_map["junior_specialist"] = d.id
        if not degree_map and degrees:
            degree_map["bachelor"] = degrees[0].id
        print(f"🎓 {len(degrees)} education degrees, map: {list(degree_map.keys())}")

        # ── 6. Lookup: language levels ──────────────────────────────────────
        result = await session.execute(
            select(LanguageLevel).order_by(LanguageLevel.sort_order)
        )
        lang_levels = list(result.scalars().all())
        level_by_code: dict[str, int] = {ll.code: ll.id for ll in lang_levels}
        print(f"🌐 {len(lang_levels)} language levels: {list(level_by_code.keys())}")

        # ── 7. Per-employee loop ────────────────────────────────────────────
        for emp in employees:
            print(f"\n{'─'*60}")
            print(f"🔹 {emp.name} ({emp.code})")
            print(f"{'─'*60}")

            await _seed_personal_data(session, emp)
            await _seed_education(session, emp, degree_map)
            if level_by_code:
                await _seed_languages(session, emp, level_by_code)
            await _seed_children(session, emp)

        await session.commit()
        print(f"\n{'='*60}")
        print(f"🎉 Done! Personal data seeded for {len(employees)} employees.")
        print(f"{'='*60}")


if __name__ == "__main__":
    asyncio.run(seed_personal_data())

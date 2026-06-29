"""
Seeder: populate proposed levels with answer facts for every employee in the
last review session (except UKR7101004).

For each employee it:
  1. Picks a random active ReviewLevel
  2. Creates a ReviewSessionEmployeeLevel (status='proposed')
  3. For each requirement of that level, creates a
     ReviewSessionEmployeeLevelAnswer with numbered facts in Ukrainian

Idempotent: skips employees that already have a proposed level.

Run:
    cd backend && poetry run python seeds/seed_proposed_levels.py
"""

import asyncio
import random
import sys
from pathlib import Path

_REPO_ROOT = Path(__file__).resolve().parents[2]
if str(_REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(_REPO_ROOT))

from sqlalchemy import select, desc
from sqlalchemy.orm import selectinload

from backend.database.db_helper import db_helper
from backend.api_v1.review_session.review_session_model import ReviewSession
from backend.api_v1.review_session_employee.review_session_employee_model import (
    ReviewSessionEmployee,
)
from backend.api_v1.employee.employee_model import Employee
from backend.api_v1.review_level.review_level_model import ReviewLevel
from backend.api_v1.review_level_requirement.review_level_requirement_model import (
    ReviewLevelRequirement,
)
from backend.api_v1.review_session_employee_level.review_session_employee_level_model import (
    ReviewSessionEmployeeLevel,
)
from backend.api_v1.review_session_employee_level_answer.review_session_employee_level_answer_model import (
    ReviewSessionEmployeeLevelAnswer,
)

# ── Level-requirement facts bank (Ukrainian) ────────────────────────────────

_LEVEL_FACTS: list[str] = [
    "Маю практичний досвід виконання подібних завдань протягом останніх 2 років.",
    "Пройшов(ла) відповідне навчання та успішно застосовую знання на практиці.",
    "Брав(ла) участь у проєктах, де ця компетенція була ключовою.",
    "Отримав(ла) позитивний зворотний зв'язок від керівника щодо цього напрямку.",
    "Регулярно демонструю цю навичку в повсякденній роботі.",
    "Маю сертифікацію, що підтверджує цей рівень компетенції.",
    "Виконував(ла) роль наставника для колег у цій сфері.",
    "Успішно застосував(ла) цю компетенцію під час кризової ситуації.",
    "Підтверджую готовність до виконання завдань цього рівня складності.",
    "Маю досвід самостійного вирішення задач у цій галузі.",
    "Брав(ла) участь у розробці та впровадженні нових процесів.",
    "Маю рекомендації від попередніх керівників щодо цієї компетенції.",
    "Пройшов(ла) спеціалізоване навчання за цим напрямком.",
    "Демонструю стабільно високі результати в цій сфері.",
    "Маю досвід управління командою під час виконання подібних завдань.",
    "Успішно завершив(ла) кілька проєктів, що вимагали цієї компетенції.",
    "Отримав(ла) визнання колег за внесок у цьому напрямку.",
    "Постійно вдосконалюю свої знання та навички в цій галузі.",
    "Маю практичний досвід застосування цієї компетенції в міжнародних проєктах.",
    "Брав(ла) участь у розробці стандартів та регламентів.",
]


def _pick(items: list, count: int = 3) -> list:
    if len(items) <= count:
        return list(items)
    return random.sample(items, count)


def _build_level_facts(req: ReviewLevelRequirement) -> str:
    """Numbered facts in Ukrainian for one level requirement."""
    chosen = _pick(_LEVEL_FACTS, random.randint(2, 3))
    return "\n".join(f"{i}. {line}" for i, line in enumerate(chosen, 1))


# ═══════════════════════════════════════════════════════════════════════════════
# Main
# ═══════════════════════════════════════════════════════════════════════════════


async def seed_proposed_levels():
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

        # ── 3. RSE list ─────────────────────────────────────────────────────
        result = await session.execute(
            select(ReviewSessionEmployee)
            .where(ReviewSessionEmployee.session_id == session_obj.id)
            .options(selectinload(ReviewSessionEmployee.employee))
        )
        rse_list: list[ReviewSessionEmployee] = list(result.scalars().all())
        print(f"👥 Found {len(rse_list)} employees in session.")

        if excluded_id is not None:
            rse_list = [r for r in rse_list if r.employee_id != excluded_id]
            print(f"👥 After exclusion: {len(rse_list)} employees to seed.")
        if not rse_list:
            print("⚠️ No employees to seed.")
            return

        # ── 4. Active review levels + requirements ──────────────────────────
        result = await session.execute(
            select(ReviewLevel)
            .where(ReviewLevel.is_active == True)
            .order_by(ReviewLevel.sort_order)
        )
        levels: list[ReviewLevel] = list(result.scalars().all())
        if not levels:
            print("❌ No active review levels found — seed aborted.")
            return
        print(f"🎚️  {len(levels)} active review levels.")

        result = await session.execute(
            select(ReviewLevelRequirement)
            .where(
                ReviewLevelRequirement.level_id.in_([lv.id for lv in levels]),
                ReviewLevelRequirement.is_active == True,
            )
            .order_by(ReviewLevelRequirement.sort_order)
        )
        level_requirements: dict[int, list[ReviewLevelRequirement]] = {}
        for req in result.scalars().all():
            level_requirements.setdefault(req.level_id, []).append(req)

        total_req = sum(len(v) for v in level_requirements.values())
        print(f"📋 {total_req} requirements across {len(level_requirements)} levels.")

        # ── 5. Per-employee loop ────────────────────────────────────────────
        created = 0
        skipped = 0

        for rse in rse_list:
            emp = rse.employee
            emp_label = f"{emp.name} ({emp.code})" if emp else f"RSE#{rse.id}"

            # Check if proposed level already exists
            result = await session.execute(
                select(ReviewSessionEmployeeLevel)
                .where(ReviewSessionEmployeeLevel.review_session_employee_id == rse.id)
                .options(selectinload(ReviewSessionEmployeeLevel.answers))
            )
            existing_level = result.scalar_one_or_none()

            if existing_level is not None and existing_level.answers:
                # Already has answers — fully seeded
                skipped += 1
                continue

            if existing_level is not None and not existing_level.answers:
                # Proposed level exists but no answers — fill them
                level_id = existing_level.level_id
                reqs = level_requirements.get(level_id, [])
                if not reqs:
                    skipped += 1
                    continue

                for req in reqs:
                    facts = _build_level_facts(req)
                    answer = ReviewSessionEmployeeLevelAnswer(
                        review_session_employee_level_id=existing_level.id,
                        requirement_id=req.id,
                        facts=facts,
                    )
                    session.add(answer)
                created += 1
                print(f"🎯 {emp_label}: filled {len(reqs)} answers (level_id={level_id})")
                continue

            # No proposed level at all — create one
            eligible = [lv for lv in levels if level_requirements.get(lv.id)]
            if not eligible:
                print(f"⚠️  {emp_label}: no levels with requirements available.")
                continue

            level = random.choice(eligible)
            reqs = level_requirements[level.id]

            proposed = ReviewSessionEmployeeLevel(
                review_session_employee_id=rse.id,
                level_id=level.id,
                status="proposed",
            )
            session.add(proposed)
            await session.flush()

            for req in reqs:
                facts = _build_level_facts(req)
                answer = ReviewSessionEmployeeLevelAnswer(
                    review_session_employee_level_id=proposed.id,
                    requirement_id=req.id,
                    facts=facts,
                )
                session.add(answer)

            created += 1
            print(f"🎯 {emp_label}: level={level.name_key} ({len(reqs)} answers)")

        await session.commit()

        print(f"\n{'='*60}")
        print(f"🎉 Done! {created} proposed levels seeded (created or answers filled), {skipped} already complete.")
        print(f"{'='*60}")


if __name__ == "__main__":
    asyncio.run(seed_proposed_levels())

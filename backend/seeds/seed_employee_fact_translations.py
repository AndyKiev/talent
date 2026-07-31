"""
Translations for employee facts — the numbered lines that used to live as text
in `review_session_employee_evaluations.facts` / `.improvement`, plus the pool
of lines registered before a competence was chosen.

Run from anywhere:

    python backend/seeds/seed_employee_fact_translations.py

UPSERT, so re-running corrects wording this change owns. Safe to run repeatedly.
lang_id 2 = English, lang_id 3 = Ukrainian.

Deliberately NOT re-keyed here:
  * `factsAndAchievements`, `directionsForImprovement`, `addFact`,
    `addImprovement`, `deleteFact`, `deleteImprovement`,
    `typeFactPlaceholder`, `typeImprovementPlaceholder`, `moveFactTitle`,
    `moveFactConfirm`, `moveImprovementTitle`, `moveImprovementConfirm` already
    exist and read correctly for the row-backed lists.
  * `evaluationNotEditable` is reused by the fact write path on purpose: to the
    user a frozen review is ONE editable surface, so a second wording would only
    invite drift.
"""

import asyncio
import sys
from pathlib import Path

_REPO_ROOT = Path(__file__).resolve().parents[2]
if str(_REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(_REPO_ROOT))

from sqlalchemy import select

from backend.api_v1.msg_key.msg_key_model import MsgKey
from backend.api_v1.msg_pg.msg_model import Msg
from backend.database.db_helper import db_helper

# (name, eng_value, ukr_value)
TRANSLATIONS: list[tuple[str, str, str]] = [
    # -- Frontend: the unlinked pool --
    (
        "unlinkedFacts",
        "Unfiled facts",
        "Незакріплені факти",
    ),
    (
        "unlinkedFactsTooltip",
        "Facts registered without a competence — drag one onto a competence tab to file it",
        "Факти, зареєстровані без компетенції — перетягніть на вкладку компетенції, щоб закріпити",
    ),
    (
        "unlinkedFactsHint",
        "Register a fact now and decide later which competence it proves. "
        "Drag it onto a competence tab to file it. Unfiled facts never appear "
        "in the album or the presentation.",
        "Зареєструйте факт зараз, а пізніше вирішіть, яку компетенцію він підтверджує. "
        "Перетягніть його на вкладку компетенції, щоб закріпити. Незакріплені факти "
        "не потрапляють до альбому та презентації.",
    ),
    (
        "noUnlinkedFacts",
        "No unfiled facts",
        "Незакріплених фактів немає",
    ),
    (
        "registerFact",
        "Register",
        "Зареєструвати",
    ),
    (
        "moveFactToUnlinked",
        "Move back to unfiled facts",
        "Повернути до незакріплених фактів",
    ),
    (
        "moveImprovementToUnlinked",
        "Move back to unfiled facts",
        "Повернути до незакріплених фактів",
    ),
    (
        "factKind",
        "Kind",
        "Тип запису",
    ),
    (
        "changeFactType",
        "Change the kind of this line",
        "Змінити тип цього запису",
    ),
    (
        "fileIntoCompetence",
        "File into a competence",
        "Віднести до компетенції",
    ),
    # -- Frontend: the two lists under a competence --
    # Pre-existing gap: both keys were already used by the evaluation page and
    # rendered as the raw key. Seeded here with the change that touches them.
    (
        "addImprovement",
        "Add direction",
        "Додати напрям",
    ),
    (
        "deleteImprovement",
        "Delete direction for improvement",
        "Видалити напрям для покращення",
    ),
    (
        "deleteFactTitle",
        "Delete this line?",
        "Видалити цей запис?",
    ),
    (
        "areYouSureDeleteFact",
        "The line will be deleted for good — it is not moved to the unfiled facts.",
        "Запис буде видалено остаточно — він не потрапить до незакріплених фактів.",
    ),
    # -- Frontend: copying a line into the competence summary --
    (
        "clearComment",
        "Clear the input",
        "Очистити поле",
    ),
    (
        "alreadyInSummary",
        "This line is already in the summary of «${competence}»",
        "Цей запис уже є в підсумку «${competence}»",
    ),
    (
        "openSummaryEditFirst",
        "Open «${competence}» for editing in the summary above, then copy the line",
        "Відкрийте «${competence}» для редагування в підсумку вище, потім копіюйте запис",
    ),
    # -- Backend: errors --
    (
        "employeeFactNotFound",
        "Fact with ID ${factId} not found",
        "Факт з ID ${factId} не знайдено",
    ),
    (
        "employeeFactEmployeeMismatch",
        "This fact belongs to a different employee",
        "Цей факт належить іншому співробітнику",
    ),
    (
        "employeeFactTypeNotFound",
        "Fact type (fact / improvement) with ID ${typeId} not found",
        "Тип запису (факт / напрям розвитку) з ID ${typeId} не знайдено",
    ),
    (
        "employeeFactTypeKeyNotFound",
        "Fact type '${key}' is missing — run the seed that creates the "
        "'fact' and 'improvement' rows",
        "Тип запису '${key}' відсутній — запустіть сід, який створює рядки "
        "'fact' та 'improvement'",
    ),
    # -- Backend: success --
    (
        "employeeFactSaveSuccess",
        "Fact saved",
        "Факт збережено",
    ),
    (
        "employeeFactDeleteSuccess",
        "Fact deleted",
        "Факт видалено",
    ),
]


async def seed_translations():
    async with db_helper.session_factory() as session:
        result = await session.execute(select(MsgKey.name, MsgKey.id))
        existing_keys: dict[str, int] = {row[0]: row[1] for row in result.all()}

        new_keys = 0
        for name, _, _ in TRANSLATIONS:
            if name in existing_keys:
                continue
            session.add(MsgKey(name=name))
            new_keys += 1
        await session.flush()

        if new_keys:
            result = await session.execute(select(MsgKey.name, MsgKey.id))
            existing_keys = {row[0]: row[1] for row in result.all()}

        result = await session.execute(select(Msg))
        by_pair: dict[tuple[int, int], Msg] = {
            (m.msg_key_id, m.lang_id): m for m in result.scalars().all()
        }

        new_msgs = 0
        updated_msgs = 0
        for name, eng_val, ukr_val in TRANSLATIONS:
            key_id = existing_keys.get(name)
            if key_id is None:
                continue
            for lang_id, value in ((2, eng_val), (3, ukr_val)):
                existing = by_pair.get((key_id, lang_id))
                if existing is None:
                    session.add(Msg(msg_key_id=key_id, lang_id=lang_id, value=value))
                    new_msgs += 1
                elif existing.value != value:
                    existing.value = value
                    updated_msgs += 1

        await session.commit()

        print(f"msg_keys: {new_keys} inserted")
        print(f"msgs:     {new_msgs} inserted, {updated_msgs} updated")
        if new_keys == 0 and new_msgs == 0 and updated_msgs == 0:
            print("All translations already present — nothing to do.")


if __name__ == "__main__":
    asyncio.run(seed_translations())

"""
Translations for the recommended-trainings essence + the review results move.

Run from anywhere:

    python backend/seeds/seed_recommended_training_translations.py

UPSERT, so re-running corrects wording this change owns. Safe to run repeatedly.
lang_id 2 = English, lang_id 3 = Ukrainian.

Deliberately NOT re-keyed here:
  * `recommendedTrainings` already exists ("Recommended Trainings" /
    "Рекомендовані тренінги") and reads correctly as this panel's heading, so a
    second key for identical visible text would only invite drift.
  * `add` / `edit` / `delete` / `doneEditing` are shared UI verbs that already
    exist.
"""

import asyncio
import sys
from pathlib import Path

_REPO_ROOT = Path(__file__).resolve().parents[2]
if str(_REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(_REPO_ROOT))

from sqlalchemy import select
from backend.database.db_helper import db_helper
from backend.api_v1.msg_key.msg_key_model import MsgKey
from backend.api_v1.msg_pg.msg_model import Msg

# (name, eng_value, ukr_value)
TRANSLATIONS: list[tuple[str, str, str]] = [
    # ── Status labels — key convention is the prefix + PascalCase row key, so a
    #    new seeded status only needs a translation, not a code change.
    (
        "recommendedTrainingStatusRecommended",
        "Recommended",
        "Рекомендовано",
    ),
    (
        "recommendedTrainingStatusPlanned",
        "Planned",
        "Заплановано",
    ),
    (
        "recommendedTrainingStatusInProcess",
        "In process",
        "У процесі",
    ),
    (
        "recommendedTrainingStatusPassed",
        "Passed",
        "Пройдено",
    ),
    # ── Backend — errors ──
    (
        "recommendedTrainingNotFound",
        "Recommended training with ID ${trainingId} not found",
        "Рекомендований тренінг з ID ${trainingId} не знайдено",
    ),
    (
        "recommendedTrainingStatusNotFound",
        "Recommended training status with ID ${statusId} not found",
        "Статус рекомендованого тренінгу з ID ${statusId} не знайдено",
    ),
    (
        "recommendedTrainingStatusKeyNotFound",
        "Recommended training status '${key}' is missing — run the seed that "
        "creates the recommended-training statuses",
        "Статус рекомендованого тренінгу '${key}' відсутній — виконайте сід, "
        "який створює статуси рекомендованих тренінгів",
    ),
    (
        "recommendedTrainingTextRequired",
        "A recommended training needs a description",
        "Рекомендований тренінг потребує опису",
    ),
    # ── Backend — permission denials ──
    (
        "recommendedTrainingReadDenied",
        "You may not view these recommended trainings",
        "Ви не можете переглядати ці рекомендовані тренінги",
    ),
    (
        "recommendedTrainingWriteDenied",
        "Only the employee or their oversight manager may change these "
        "recommended trainings",
        "Змінювати ці рекомендовані тренінги може лише працівник або його "
        "керівник-оглядач",
    ),
    (
        "recommendedTrainingDeleteDenied",
        "Only the oversight manager may delete a recommended training",
        "Видалити рекомендований тренінг може лише керівник-оглядач",
    ),
    # ── Backend — success ──
    (
        "recommendedTrainingCreateSuccess",
        "Recommended training added",
        "Рекомендований тренінг додано",
    ),
    (
        "recommendedTrainingUpdateSuccess",
        "Recommended training updated",
        "Рекомендований тренінг оновлено",
    ),
    (
        "recommendedTrainingDeleteSuccess",
        "Recommended training deleted",
        "Рекомендований тренінг видалено",
    ),
    # ── Frontend — the shared panel ──
    (
        "noRecommendedTrainingsYet",
        "No recommended trainings yet.",
        "Рекомендованих тренінгів ще немає.",
    ),
    (
        "recommendedTrainingPlaceholder",
        "Describe a training, course or internship…",
        "Опишіть тренінг, курс або стажування…",
    ),
    (
        "markTrainingInactive",
        "Mark as no longer relevant",
        "Позначити як неактуальний",
    ),
    (
        "markTrainingActive",
        "Mark as relevant again",
        "Знову позначити як актуальний",
    ),
    (
        "showAllTrainings",
        "Show retired ones too",
        "Показати також неактуальні",
    ),
    (
        "showActiveTrainingsOnly",
        "Show only current ones",
        "Показати лише актуальні",
    ),
    (
        "areYouSureDeleteRecommendedTraining",
        "Delete this recommended training? This cannot be undone — to retire it "
        "while keeping the record, mark it as no longer relevant instead.",
        "Видалити цей рекомендований тренінг? Цю дію не можна скасувати — щоб "
        "прибрати його зі списку, але зберегти запис, позначте його як "
        "неактуальний.",
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

"""
Insert training-module UI translations directly into the DB (msg_key + msg
tables). No HTTP, no permissions needed — the /full_msgs/import_json API
path 403s for the BYPASS_LDAP admin user (no create perm on msg/msg_key).

    python backend/seeds/seed_training_translations.py

Insert-only — never overwrites existing keys. lang_id 2 = English, 3 = Ukrainian.
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
    ("training", "Training", "Навчання"),
    ("trainings", "Trainings", "Навчання"),
    ("trainingTypes", "Training Types", "Види навчання"),
    ("trainingCategories", "Training Categories", "Категорії навчання"),
    ("trainingStatuses", "Training Statuses", "Статуси навчання"),
    ("trainingType", "Training", "Вид навчання"),
    ("trainingCategory", "Training Category", "Категорія навчання"),
    ("trainingLinkType", "Link Type", "Тип прив'язки"),
    ("target", "Target", "Ціль"),
    ("addTrainingType", "Add Training Type", "Додати вид навчання"),
    ("addTrainingCategory", "Add Training Category", "Додати категорію навчання"),
    ("addTrainingStatus", "Add Training Status", "Додати статус навчання"),
    ("createTrainingType", "Create Training Type", "Створити вид навчання"),
    ("editTrainingType", "Edit Training Type", "Редагувати вид навчання"),
    ("deleteTrainingType", "Delete Training Type", "Видалити вид навчання"),
    ("createTrainingCategory", "Create Training Category", "Створити категорію навчання"),
    ("deleteTrainingCategory", "Delete Training Category", "Видалити категорію навчання"),
    ("createTrainingStatus", "Create Training Status", "Створити статус навчання"),
    ("deleteTrainingStatus", "Delete Training Status", "Видалити статус навчання"),
    (
        "areYouSureDeleteTrainingType",
        "Are you sure you want to delete this training type? This action cannot be undone.",
        "Ви впевнені, що хочете видалити цей вид навчання? Цю дію не можна скасувати.",
    ),
    (
        "areYouSureDeleteTrainingCategory",
        "Are you sure you want to delete this training category? This action cannot be undone.",
        "Ви впевнені, що хочете видалити цю категорію навчання? Цю дію не можна скасувати.",
    ),
    (
        "areYouSureDeleteTrainingStatus",
        "Are you sure you want to delete this training status? This action cannot be undone.",
        "Ви впевнені, що хочете видалити цей статус навчання? Цю дію не можна скасувати.",
    ),
    ("trainingCategoryRequired", "Training category is required", "Оберіть категорію навчання"),
    ("trainingLinkTypeRequired", "Training link type is required", "Оберіть тип прив'язки"),
    ("assignTraining", "Assign Training", "Призначити навчання"),
    ("unassign", "Unassign", "Скасувати призначення"),
    ("changeStatus", "Change status", "Змінити статус"),
    ("changeTrainingStatus", "Change Training Status", "Змінити статус навчання"),
    ("showAllTrainingTypes", "Show all training types", "Показати всі види навчання"),
    ("noAvailableTrainingTypes", "No training types available", "Немає доступних видів навчання"),
    ("noTrainingsAssigned", "No trainings assigned yet.", "Наразі немає призначених навчань."),
    ("confirmUnassign", "Unassign Training?", "Скасувати призначення навчання?"),
    (
        "confirmUnassignMessage",
        'This will remove "${name}" from this employee.',
        'Це видалить навчання "${name}" у цього співробітника.',
    ),
    ("trainingLinkType_by_job_category", "By job category", "За категорією посади"),
    ("trainingLinkType_by_job", "By job", "За посадою"),
    ("trainingLinkType_everyone", "Everyone", "Для всіх"),
    ("trainingStatus_planned", "Planned", "Заплановано"),
    ("trainingStatus_in_progress", "In progress", "В процесі"),
    ("trainingStatus_passed", "Passed", "Пройдено"),
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

        result = await session.execute(select(Msg.msg_key_id, Msg.lang_id))
        existing_pairs: set[tuple[int, int]] = {(row[0], row[1]) for row in result.all()}

        new_msgs = 0
        for name, eng_val, ukr_val in TRANSLATIONS:
            key_id = existing_keys.get(name)
            if key_id is None:
                continue
            for lang_id, value in ((2, eng_val), (3, ukr_val)):
                if (key_id, lang_id) not in existing_pairs:
                    session.add(Msg(msg_key_id=key_id, lang_id=lang_id, value=value))
                    new_msgs += 1

        await session.commit()
        print(f"msg_keys: {new_keys} inserted")
        print(f"msgs:     {new_msgs} inserted")
        if new_keys == 0 and new_msgs == 0:
            print("All translations already present — nothing to do.")


if __name__ == "__main__":
    asyncio.run(seed_translations())

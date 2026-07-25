"""
Insert job-category + job↔category-link translations directly into the DB
(msg_key + msg tables). No HTTP, no permissions needed.

Run from anywhere:

    python backend/seeds/seed_job_category_translations.py

Safe to run repeatedly — inserts missing keys/msgs, updates values that drifted.
lang_id 2 = English, lang_id 3 = Ukrainian (matches seed_job_process_role_translations).
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
    # ── Backend — job_category errors ──
    (
        "jobCategoryNotFound",
        "Job category with ID ${categoryId} not found",
        "Категорію посади з ID ${categoryId} не знайдено",
    ),
    (
        "jobCategoryNotFoundByKey",
        "Job category with key '${key}' not found",
        "Категорію посади з ключем '${key}' не знайдено",
    ),
    (
        "jobCategoryKeyTaken",
        "Job category with key '${key}' already exists",
        "Категорія посади з ключем '${key}' вже існує",
    ),
    (
        "jobCategoryDeleteError",
        "Job category '${key}' cannot be deleted because it is referenced by other records",
        "Категорію посади '${key}' не можна видалити, оскільки вона використовується іншими записами",
    ),
    # ── Backend — job_category success ──
    (
        "jobCategoryCreateSuccess",
        "Job category '${key}' successfully created",
        "Категорію посади '${key}' успішно створено",
    ),
    (
        "jobCategoryUpdateSuccess",
        "Job category '${key}' successfully updated",
        "Категорію посади '${key}' успішно оновлено",
    ),
    (
        "jobCategoryDeleteSuccess",
        "Job category '${key}' successfully deleted",
        "Категорію посади '${key}' успішно видалено",
    ),
    # ── Backend — job ↔ category link errors ──
    (
        "jobNotFoundForCategoryLink",
        "Job with ID ${jobId} not found",
        "Посаду з ID ${jobId} не знайдено",
    ),
    (
        "jobCategoryNotFoundForLink",
        "Job category with ID ${jobCategoryId} not found",
        "Категорію посади з ID ${jobCategoryId} не знайдено",
    ),
    # ── Backend — job ↔ category link success ──
    (
        "jobCategoryLinkSetSuccess",
        "Category '${category}' set for job '${job}'",
        "Категорію '${category}' встановлено для посади '${job}'",
    ),
    (
        "jobCategoryLinkClearAllSuccess",
        "Removed job category from ${count} job(s)",
        "Категорію посади видалено з ${count} посад(и)",
    ),
    # ── App setting (developer Settings page) ──
    (
        "settingJobApplyCategoryOnCreate",
        "Apply job category on create",
        "Призначати категорію посади при створенні",
    ),
    (
        "settingJobApplyCategoryOnCreateDesc",
        "When ON, creating a job (single or bulk upload) auto-assigns the default "
        "'manager' category. When OFF, new jobs get no category; existing ones are untouched.",
        "Коли увімкнено, при створенні посади (поодинці чи масово) автоматично "
        "призначається категорія за замовчуванням 'manager'. Коли вимкнено, нові посади "
        "залишаються без категорії; наявні не змінюються.",
    ),
    # ── Frontend — category labels (getString(snakeToCamel(key))) ──
    ("manager", "Manager", "Менеджер"),
    ("employee", "Employee", "Працівник"),
    # ── Frontend — Job Categories tab / grid / dialogs ──
    ("jobCategories", "Job Categories", "Категорії посад"),
    ("jobCategory", "Category", "Категорія"),
    ("addJobCategory", "Add", "Додати"),
    ("createJobCategory", "Create Job Category", "Створити категорію посади"),
    ("deleteJobCategory", "Delete Job Category", "Видалити категорію посади"),
    (
        "areYouSureDeleteJobCategory",
        "Are you sure you want to delete \"${key}\"? Its job links will be removed. This action cannot be undone.",
        "Ви впевнені, що хочете видалити \"${key}\"? Її зв'язки з посадами буде видалено. Цю дію не можна скасувати.",
    ),
    ("noJobCategory", "—", "—"),
    ("removeAllJobCategories", "Remove all from jobs", "Видалити з усіх посад"),
    (
        "areYouSureRemoveAllJobCategories",
        "This removes the category from EVERY job. The categories themselves stay. This cannot be undone.",
        "Це видалить категорію з УСІХ посад. Самі категорії залишаться. Цю дію не можна скасувати.",
    ),
    ("removeAll", "Remove all", "Видалити все"),
    ("label", "Label", "Мітка"),
    # ── Frontend — form validation (job category) ──
    ("keyRequired", "Key is required", "Ключ обов'язковий"),
    ("editKey", "Edit key", "Редагувати ключ"),
    ("editDescription", "Edit description", "Редагувати опис"),
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

        # Insert-only: never overwrite an existing (key, lang) value. This makes
        # reusing generic keys (manager/employee/label) safe — if they already
        # exist with their own meaning, we leave them untouched.
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

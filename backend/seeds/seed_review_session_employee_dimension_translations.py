"""
Insert / update the translations for the review_session_employee_dimension
essence directly into the DB (msg_keys + msgs tables). No HTTP, no permissions
needed.

Run from anywhere:

    python backend/seeds/seed_review_session_employee_dimension_translations.py

UPSERT, not insert-only: every key below is one this change owns, so the seed
stays the source of truth for their wording. That matters in practice — the keys
were first seeded under their pre-rename names and had to be corrected in place.
`reviewDimensionDeleteError` is here too: deleting a dimension a review still
references is now BLOCKED, and the old text ("referenced by other records") left
the reader with no idea what to do, so it must name deactivation as the way out.

Safe to run repeatedly. lang_id 2 = English, lang_id 3 = Ukrainian.
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
    # ── Backend — review_session_employee_dimension_type errors ──
    (
        "reviewSessionEmployeeDimensionTypeNotFound",
        "Dimension type (strong / to develop) with ID ${typeId} not found",
        "Тип виміру (сильний / для розвитку) з ID ${typeId} не знайдено",
    ),
    (
        "reviewSessionEmployeeDimensionTypeKeyNotFound",
        "Dimension type '${key}' is missing — run the seed that creates the "
        "'strong' and 'develop' rows",
        "Тип виміру '${key}' відсутній — виконайте сід, який створює записи "
        "'strong' та 'develop'",
    ),
    # ── Frontend — the review's singled-out dimensions ──
    # Used in two places, same root cause: the strong / to-develop lookup did not
    # load, so a picked dimension has no side id. Blocks the evaluation page and
    # a star re-rating that would flip a dimension to the other side.
    (
        "dimensionTypesUnavailable",
        "The strong / to-develop sections could not be loaded. Reload the page; "
        "if this keeps happening, the dimension type reference data is missing.",
        "Не вдалося завантажити розділи «сильні» / «для розвитку». Перезавантажте "
        "сторінку; якщо це повторюється, довідкові дані типів вимірів відсутні.",
    ),
    # ── Backend — review_dimension ──
    (
        "reviewDimensionDeleteError",
        "Competence '${name}' cannot be deleted because it is used in review "
        "summaries or development plans. Deactivate it instead — it will stop "
        "being offered while existing reviews keep it.",
        "Компетенцію '${name}' неможливо видалити, оскільки вона використовується "
        "в підсумках оцінювання або планах розвитку. Замість цього деактивуйте "
        "її — вона більше не пропонуватиметься, а наявні оцінювання її збережуть.",
    ),
]

# NOTE: the two section headings are NOT re-keyed here. They already come from
# `strongCompetences` / `competencesToDevelop`, and minting a second key for the
# same visible text would give one heading two sources that could drift apart.


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

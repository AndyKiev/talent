"""
Insert HR staffing-snapshot Excel header translations directly into the DB
(msg_key + msg tables). No HTTP, no permissions needed.

    python backend/seeds/seed_hr_snapshot_translations.py

English values come straight from the renderer's in-code fallbacks
(DEFAULT_LABELS in backend/utils/hr_excel_builder/render_snapshot_excel.py) so
the two never drift; Ukrainian values live here.

Insert-only — never overwrites existing keys. lang_id 2 = English, 3 = Ukrainian.
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
from backend.utils.hr_excel_builder.render_snapshot_excel import (
    DEFAULT_LABELS,
    LABEL_KEYS,
)

# slot -> Ukrainian value (the headers the reference workbook uses)
UKR_LABELS: dict[str, str] = {
    "object": "Об'єкт",
    "total": "Всього",
    "target": "ціль",
    "fact": "реалізовано",
    "pct": "% вик.",
    "base_target": "ціль базова",
    "object_target": "ціль об'єкта",
    "status_pa": "Па",
    "status_po": "По",
}

# (name, eng_value, ukr_value)
TRANSLATIONS: list[tuple[str, str, str]] = [
    (LABEL_KEYS[slot], DEFAULT_LABELS[slot], UKR_LABELS[slot]) for slot in LABEL_KEYS
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

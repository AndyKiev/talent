"""
Insert self-registration translations directly into the DB (msg_key + msg).
No HTTP, no permissions needed.

Run from anywhere:

    python backend/seeds/seed_self_registration_translations.py

Safe to run repeatedly — inserts missing keys/msgs only.
lang_id 2 = English, lang_id 3 = Ukrainian.
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
    # ── App setting (developer Settings page) ──
    (
        "settingSelfRegistrationEnabled",
        "Self-registration on login page",
        "Самореєстрація на сторінці входу",
    ),
    (
        "settingSelfRegistrationEnabledDesc",
        "When ON, the login page offers a Register option: a person without an "
        "employee record can create one (code + name + email on an allowed domain) "
        "and lands as active with status 'pending' and no job. When OFF, only the "
        "regular login form is shown and the register endpoint refuses.",
        "Коли увімкнено, на сторінці входу з'являється опція «Реєстрація»: особа "
        "без запису працівника може створити його (код + ім'я + пошта на дозволеному "
        "домені) і отримує статус «pending», активна, без посади. Коли вимкнено, "
        "доступна лише звичайна форма входу, а ендпоінт реєстрації відхиляє запити.",
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

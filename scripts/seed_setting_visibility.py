"""Seed: add the `settingVisibility` translation key directly to the DB.
Run from the backend directory:  cd backend && poetry run python ../scripts/seed_setting_visibility.py
"""

import asyncio
import sys
import os

# Ensure the backend package is importable regardless of cwd.
# The `backend` package lives at <repo-root>/backend, so we add the
# repo root (one dir above this script's dir) to sys.path.
_scripts_dir = os.path.dirname(os.path.abspath(__file__))
_repo_root = os.path.dirname(_scripts_dir)
if _repo_root not in sys.path:
    sys.path.insert(0, _repo_root)

from backend.database.db_helper import db_helper
from backend.api_v1.msg_key.msg_key_model import MsgKey
from backend.api_v1.msg_pg.msg_model import Msg
from sqlalchemy import select


MESSAGE_KEY = "settingVisibility"
UKR = "Видимість налаштування"
ENG = "Setting visibility"


async def seed():
    async with db_helper.session_factory() as session:
        # Find or create the message key
        key_row = await session.scalar(
            select(MsgKey).where(MsgKey.name == MESSAGE_KEY)
        )
        if key_row is None:
            key_row = MsgKey(name=MESSAGE_KEY)
            session.add(key_row)
            await session.flush()
            print(f"  Created msg_key: {MESSAGE_KEY}")
        else:
            print(f"  msg_key already exists (id={key_row.id})")

        # Upsert: eng (lang_id=2) and ukr (lang_id=3)
        for lang_id, text in [(2, ENG), (3, UKR)]:
            existing = await session.scalar(
                select(Msg).where(
                    Msg.msg_key_id == key_row.id,
                    Msg.lang_id == lang_id,
                )
            )
            if existing:
                existing.value = text
                print(f"  Updated lang_id={lang_id}: {text}")
            else:
                session.add(Msg(msg_key_id=key_row.id, lang_id=lang_id, value=text))
                print(f"  Created lang_id={lang_id}: {text}")

        await session.commit()
        print(f"Done. Key '{MESSAGE_KEY}' is ready.")


if __name__ == "__main__":
    asyncio.run(seed())

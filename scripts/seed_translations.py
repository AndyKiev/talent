"""Seed translations directly into the DB (no UI import needed).

Accepts a JSON object on stdin or a JSON file path as first argument.
Shape: {"keyName": {"ukr": "...", "eng": "..."}, ...}

Run from the backend directory:
  cd backend && poetry run python ../scripts/seed_translations.py < translations.json
  cd backend && poetry run python ../scripts/seed_translations.py path/to/translations.json

To add translations inline via pipe (no file):
  echo '{"myKey":{"ukr":"мій ключ","eng":"my key"}}' | cd backend && poetry run python ../scripts/seed_translations.py
"""

import asyncio
import json
import sys
import os

_scripts_dir = os.path.dirname(os.path.abspath(__file__))
_repo_root = os.path.dirname(_scripts_dir)
if _repo_root not in sys.path:
    sys.path.insert(0, _repo_root)

from backend.database.db_helper import db_helper
from backend.api_v1.msg_key.msg_key_model import MsgKey
from backend.api_v1.msg_pg.msg_model import Msg
from sqlalchemy import select


async def seed(translations: dict[str, dict[str, str]]):
    async with db_helper.session_factory() as session:
        for key_name, texts in translations.items():
            ukr = texts.get("ukr", "")
            eng = texts.get("eng", "")
            if not ukr or not eng:
                print(f"  SKIP {key_name}: missing ukr or eng")
                continue

            key_row = await session.scalar(select(MsgKey).where(MsgKey.name == key_name))
            if key_row is None:
                key_row = MsgKey(name=key_name)
                session.add(key_row)
                await session.flush()
                print(f"  Created msg_key: {key_name}")
            else:
                print(f"  msg_key exists: {key_name} (id={key_row.id})")

            # Upsert: eng (lang_id=2) and ukr (lang_id=3)
            for lang_id, text in [(2, eng), (3, ukr)]:
                existing = await session.scalar(
                    select(Msg).where(Msg.msg_key_id == key_row.id, Msg.lang_id == lang_id)
                )
                if existing:
                    if existing.value != text:
                        existing.value = text
                        print(f"    Updated lang_id={lang_id}")
                else:
                    session.add(Msg(msg_key_id=key_row.id, lang_id=lang_id, value=text))
                    print(f"    Created lang_id={lang_id}")

        await session.commit()
        print(f"\nDone. {len(translations)} key(s) processed.")


if __name__ == "__main__":
    if len(sys.argv) > 1:
        path = sys.argv[1]
        with open(path, encoding="utf-8-sig") as f:
            data = json.load(f)
    else:
        raw = sys.stdin.read()
        if not raw.strip():
            print("Usage: pipe JSON to stdin or pass a JSON file path", file=sys.stderr)
            sys.exit(1)
        data = json.loads(raw)

    asyncio.run(seed(data))

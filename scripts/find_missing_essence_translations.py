"""Find essences in the DB that lack translations.
Run from the backend directory:  cd backend && poetry run python ../scripts/find_missing_essence_translations.py
"""

import asyncio
import sys
import os

_scripts_dir = os.path.dirname(os.path.abspath(__file__))
_repo_root = os.path.dirname(_scripts_dir)
if _repo_root not in sys.path:
    sys.path.insert(0, _repo_root)

from backend.database.db_helper import db_helper
from backend.api_v1.essence.essence_model import Essence
from backend.api_v1.msg_key.msg_key_model import MsgKey
from backend.api_v1.msg_pg.msg_model import Msg
from sqlalchemy import select


def snake_to_camel(s: str) -> str:
    """Mirror the frontend's snakeToCamel: 'employee_event_type' -> 'employeeEventType'."""
    parts = s.split("_")
    return parts[0].lower() + "".join(
        p[0].upper() + p[1:].lower() for p in parts[1:]
    )


async def find_missing():
    async with db_helper.session_factory() as session:
        essences = (await session.execute(select(Essence))).scalars().all()
        print(f"Total essences in DB: {len(essences)}\n")

        missing = []
        have = []
        for e in essences:
            camel = snake_to_camel(e.name)
            key = await session.scalar(select(MsgKey).where(MsgKey.name == camel))
            if key is None:
                missing.append((e.name, camel))
            else:
                msgs = (
                    await session.execute(select(Msg).where(Msg.msg_key_id == key.id))
                ).scalars().all()
                have.append((e.name, camel, len(msgs), [m.lang_id for m in msgs]))

        print("=== HAVE TRANSLATIONS ===")
        for name, camel, cnt, langs in sorted(have):
            print(f"  {name} -> {camel}  ({cnt} langs: {langs})")

        print(f"\n=== MISSING TRANSLATIONS ({len(missing)}) ===")
        for name, camel in sorted(missing):
            print(f"  {name} -> {camel}")


if __name__ == "__main__":
    asyncio.run(find_missing())

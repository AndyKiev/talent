"""Show a few existing translations to understand the pattern."""
import asyncio
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


async def show():
    async with db_helper.session_factory() as session:
        for name in ["employeeEvent", "talentAudit", "department", "menu"]:
            key = await session.scalar(select(MsgKey).where(MsgKey.name == name))
            if key:
                msgs = (await session.execute(
                    select(Msg).where(Msg.msg_key_id == key.id)
                )).scalars().all()
                print(f"{name}:")
                for m in msgs:
                    print(f"  lang_id={m.lang_id}: {m.value}")
            else:
                print(f"{name}: NOT FOUND")
            print()


if __name__ == "__main__":
    asyncio.run(show())

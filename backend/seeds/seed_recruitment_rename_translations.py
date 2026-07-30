"""
Insert the essence-label translations the recruitment rename needs (msg_key + msg
tables, direct DB — no HTTP, no permissions).

    python backend/seeds/seed_recruitment_rename_translations.py

Why this is needed: an essence's LABEL key is the camelCase of `essences.name` (see
scripts/find_missing_essence_translations.py, which is how the app resolves them). The
rename migration c7e1a94f5b30 changed six essence names, so six labels need new keys.
The old keys (`candidate`, `pipelineStatus`, …) go dead — they are left in place rather
than deleted, so nothing that still resolves them breaks mid-deploy.

Table-description keys (`dbTableDesc<PascalTableName>`) are NOT here: those come from
TABLE_DESCRIPTIONS_EN and are seeded by seed_db_table_desc_translations.py, which is
insert-only and idempotent. Run that one too, after the migration.

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

# (msg_key, English, Ukrainian) — one per renamed essence, keyed by the camelCase of the
# new essences.name value.
TRANSLATIONS: list[tuple[str, str, str]] = [
    ("recruitmentCandidate", "Candidate", "Кандидат"),
    ("recruitmentCandidateSource", "Candidate source", "Джерело кандидата"),
    ("recruitmentApplication", "Application", "Заявка"),
    ("recruitmentApplicationStatus", "Application status", "Статус заявки"),
    ("recruitmentInterview", "Interview", "Співбесіда"),
    ("recruitmentInterviewFeedback", "Interview feedback", "Відгук про співбесіду"),
]


async def seed_translations() -> None:
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
        existing_pairs: set[tuple[int, int]] = {
            (row[0], row[1]) for row in result.all()
        }

        new_msgs = 0
        for name, eng_val, ukr_val in TRANSLATIONS:
            key_id = existing_keys.get(name)
            if key_id is None:
                continue
            for lang_id, value in ((2, eng_val), (3, ukr_val)):
                if not value:
                    continue
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

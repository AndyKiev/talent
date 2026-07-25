"""Idempotent seed for people-review competency levels + requirements.

Reads ``levels_seed.json`` (generated from .claude/input/Levels.csv) and inserts
the ReviewLevel rows and their ReviewLevelRequirement children, referencing the
translation keys already loaded into the messages DB. Safe to run repeatedly:
levels are matched by ``name_key`` and requirements by (level_id, text_key).

Run from the repo root after the migration is applied:
    poetry run python -m backend.scripts.seed_review_levels
or simply:
    python backend/scripts/seed_review_levels.py
"""

import asyncio
import json
import os
import sys
from pathlib import Path

# Make the repo root importable so `backend...` resolves regardless of CWD.
sys.path.insert(
    0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
)

from backend.api_v1.review_level.review_level_model import ReviewLevel
from backend.api_v1.review_level_requirement.review_level_requirement_model import (
    ReviewLevelRequirement,
)
from backend.database.db_helper import db_helper
from sqlalchemy import select

SEED_FILE = Path(__file__).with_name("levels_seed.json")


async def main() -> None:
    data = json.loads(SEED_FILE.read_text(encoding="utf-8"))
    created_levels = 0
    created_reqs = 0

    async with db_helper.session_factory() as session:
        for lvl in data:
            level = await session.scalar(
                select(ReviewLevel).where(ReviewLevel.name_key == lvl["name_key"])
            )
            if level is None:
                level = ReviewLevel(
                    name_key=lvl["name_key"],
                    description_key=lvl.get("description_key"),
                    sort_order=lvl.get("sort_order", 0),
                    is_active=lvl.get("is_active", True),
                )
                session.add(level)
                await session.flush()
                created_levels += 1

            for req in lvl["requirements"]:
                exists = await session.scalar(
                    select(ReviewLevelRequirement).where(
                        ReviewLevelRequirement.level_id == level.id,
                        ReviewLevelRequirement.text_key == req["text_key"],
                    )
                )
                if exists is None:
                    session.add(
                        ReviewLevelRequirement(
                            level_id=level.id,
                            text_key=req["text_key"],
                            sort_order=req.get("sort_order", 0),
                            is_active=True,
                        )
                    )
                    created_reqs += 1

        await session.commit()

    await db_helper.dispose()
    print(
        f"seed done — levels created: {created_levels}, requirements created: {created_reqs}"
    )


if __name__ == "__main__":
    asyncio.run(main())

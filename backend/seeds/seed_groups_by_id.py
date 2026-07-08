"""
Seed: populate the id/flag-based group references introduced by the expand
migration b7f3c1d9a2e4, reading the still-present menus.allowed_groups live.

Order:
    poetry run alembic upgrade b7f3c1d9a2e4     # expand (adds table + columns)
    python backend/seeds/seed_groups_by_id.py   # THIS (fills data)
    poetry run alembic upgrade head             # contract (drops allowed_groups)

What it does (idempotent):
  - Role flags, frozen from the current names ONCE:
      user_group_types.is_authorisation  <- name == 'authorisation'
      user_groups.is_bypass              <- name == 'dev'   (authorisation type)
      user_groups.is_regular_baseline    <- name == 'regular'(authorisation type)
  - Menu visibility, from menus.allowed_groups (CSV of names, case-insensitive):
      NULL / empty        -> menus.visible_to_all_groups = TRUE
      'a,b'               -> one menu_user_group_links row per resolved group id

Run from anywhere (repo root is added to sys.path).
"""

import asyncio
import sys
from pathlib import Path

_repo_root = Path(__file__).resolve().parents[2]
if str(_repo_root) not in sys.path:
    sys.path.insert(0, str(_repo_root))

from sqlalchemy import text

from backend.database.db_helper import db_helper


async def seed_groups_by_id() -> None:
    async with db_helper.session_factory() as session:
        # ── 1. Role flags (names still present; frozen into flags once) ───────
        await session.execute(
            text(
                "UPDATE user_group_types SET is_authorisation = TRUE "
                "WHERE lower(name) = 'authorisation'"
            )
        )
        await session.execute(
            text(
                """
                UPDATE user_groups SET is_regular_baseline = TRUE
                WHERE lower(name) = 'regular'
                  AND user_group_type_id IN (
                      SELECT id FROM user_group_types WHERE is_authorisation
                  )
                """
            )
        )
        await session.execute(
            text(
                """
                UPDATE user_groups SET is_bypass = TRUE
                WHERE lower(name) = 'dev'
                  AND user_group_type_id IN (
                      SELECT id FROM user_group_types WHERE is_authorisation
                  )
                """
            )
        )

        # ── 2. Group name -> id map (case-insensitive) ────────────────────────
        gmap: dict[str, int] = {}
        for gid, gname in (
            await session.execute(text("SELECT id, name FROM user_groups"))
        ).all():
            if gname:
                gmap[gname.strip().lower()] = gid

        # ── 3. Menu visibility, read from the still-present allowed_groups ────
        rows = (
            await session.execute(text("SELECT id, allowed_groups FROM menus"))
        ).all()

        links_created = 0
        all_groups_flagged = 0
        for menu_id, allowed in rows:
            if allowed is None or not allowed.strip():
                await session.execute(
                    text(
                        "UPDATE menus SET visible_to_all_groups = TRUE "
                        "WHERE id = :m"
                    ),
                    {"m": menu_id},
                )
                all_groups_flagged += 1
                continue

            for raw_name in allowed.split(","):
                key = raw_name.strip().lower()
                if not key:
                    continue
                gid = gmap.get(key)
                if gid is None:
                    print(
                        f"  ! menu id={menu_id}: no group named "
                        f"'{raw_name.strip()}' — skipped"
                    )
                    continue
                result = await session.execute(
                    text(
                        """
                        INSERT INTO menu_user_group_links (menu_id, user_group_id)
                        VALUES (:m, :g)
                        ON CONFLICT (menu_id, user_group_id) DO NOTHING
                        """
                    ),
                    {"m": menu_id, "g": gid},
                )
                links_created += result.rowcount or 0

        await session.commit()

        # ── 4. Safety report (does NOT gate; caller must verify) ──────────────
        counts = (
            await session.execute(
                text(
                    "SELECT "
                    "(SELECT count(*) FROM user_group_types WHERE is_authorisation),"
                    "(SELECT count(*) FROM user_groups WHERE is_bypass),"
                    "(SELECT count(*) FROM user_groups WHERE is_regular_baseline)"
                )
            )
        ).one()
        print(
            f"seed_groups_by_id: done — "
            f"menu links +{links_created}, all-groups menus {all_groups_flagged}; "
            f"flags: auth_types={counts[0]} bypass={counts[1]} regular={counts[2]}"
        )
        if not all(counts):
            print(
                "  ⚠️  A role-flag count is 0 — the auth path will lock users "
                "out. Check the seeded group/type NAMES before serving new code."
            )


if __name__ == "__main__":
    asyncio.run(seed_groups_by_id())

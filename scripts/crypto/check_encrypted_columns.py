# scripts/crypto/check_encrypted_columns.py
"""Audit the encrypted-column registry against the LIVE database. Read-only.

    python scripts/crypto/check_encrypted_columns.py

Checks three things the registry cannot check itself:

1. **The rows still point at real columns.** The registry holds table/column
   strings, and a rename does not update them — the entry just goes quiet and
   the column silently stops being encrypted on the next deploy.
2. **The column type is text.** A registered column still typed `date` or
   `varchar(n)` means the migration never ran here (or was rolled back), so the
   data is sitting in plaintext.
3. **The data really is encrypted.** Samples rows and reports any that are not
   in `v1:` form — which is what an interrupted data migration looks like.

Queries `information_schema` directly rather than the cached
`backend/db_table_info.json`, which is stale until someone clicks Refresh in the
developer UI.

Exit code 1 if anything is wrong, so it can gate a deploy.
"""

import asyncio
import sys
from pathlib import Path

_REPO_ROOT = Path(__file__).resolve().parents[2]
if str(_REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(_REPO_ROOT))

from sqlalchemy import text

from backend.database.db_helper import db_helper
from backend.utils.crypto.cipher import is_encrypted
from backend.utils.crypto.registry import ENCRYPTED_COLUMNS

SAMPLE_LIMIT = 200


async def main() -> int:
    problems: list[str] = []
    async with db_helper.session_factory() as session:
        for entry in ENCRYPTED_COLUMNS:
            row = (
                await session.execute(
                    text(
                        "SELECT data_type FROM information_schema.columns "
                        "WHERE table_schema='public' AND table_name=:t "
                        "AND column_name=:c"
                    ),
                    {"t": entry.table, "c": entry.column},
                )
            ).first()

            if row is None:
                problems.append(
                    f"[MISSING] {entry.table}.{entry.column} does not exist — "
                    "renamed or dropped? A registry row that resolves to nothing "
                    "means the column is NOT being encrypted."
                )
                continue

            data_type = row[0]
            if data_type != "text":
                problems.append(
                    f"[TYPE] {entry.table}.{entry.column} is '{data_type}', "
                    "expected 'text' — the encryption migration has not been "
                    "applied here, so this data is in PLAINTEXT."
                )
                continue

            rows = (
                await session.execute(
                    text(
                        f"SELECT {entry.column} FROM {entry.table} "
                        f"WHERE {entry.column} IS NOT NULL LIMIT {SAMPLE_LIMIT}"
                    )
                )
            ).scalars()
            plain = [v for v in rows if not is_encrypted(v)]
            if plain:
                problems.append(
                    f"[PLAINTEXT] {entry.table}.{entry.column}: {len(plain)} of the "
                    f"sampled rows are not encrypted — an interrupted data "
                    "migration. Re-run `alembic upgrade head`."
                )
            else:
                print(f"[OK] {entry.table}.{entry.column} ({entry.kind})")

    if problems:
        print()
        for p in problems:
            print(p)
        print(f"\n{len(problems)} problem(s).")
        return 1
    print(f"\nAll {len(ENCRYPTED_COLUMNS)} registered column(s) encrypted and valid.")
    return 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))

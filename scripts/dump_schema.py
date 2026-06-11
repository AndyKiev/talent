#!/usr/bin/env python3
"""Dump a COMPACT, diff-stable Postgres schema snapshot to a text file.

Cross-platform (no Docker needed) twin of dump_schema.ps1 / dump_schema.sh.
Use this from the project's venv on either TL (Windows) or TLW (Linux):

    python scripts/dump_schema.py

It connects DIRECTLY to Postgres using the DB creds from .env
(APP_CONFIG__DB__HOST/PORT/NAME/USER/PASSWORD), so it works whether Postgres
runs in Docker or natively. Output: scripts/schema_snapshot.txt next to this
script, byte-for-byte the same format as the .ps1/.sh versions so the two
snapshots diff cleanly. Sorted alphabetically => id-column reorder = no false diff.

Override any field via env or flags, e.g.:
    DB_HOST=127.0.0.1 DB_PORT=5433 python scripts/dump_schema.py
    python scripts/dump_schema.py --host 127.0.0.1 --port 5433
"""
from __future__ import annotations

import argparse
import asyncio
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

import asyncpg  # already a project dependency

HERE = Path(__file__).resolve().parent
REPO_ROOT = HERE.parent
DEFAULT_OUT = HERE / "schema_snapshot.txt"


def load_env() -> None:
    """Populate os.environ from the repo .env (dotenv if available, else manual)."""
    env_path = REPO_ROOT / ".env"
    if not env_path.exists():
        return
    try:
        from dotenv import load_dotenv  # project already uses this

        load_dotenv(env_path)
        return
    except Exception:
        pass
    for raw in env_path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, val = line.partition("=")
        os.environ.setdefault(key.strip(), val.strip().strip('"').strip("'"))


def conn_params(args: argparse.Namespace) -> dict:
    return {
        "host": args.host or os.getenv("APP_CONFIG__DB__HOST", "127.0.0.1"),
        "port": int(args.port or os.getenv("APP_CONFIG__DB__PORT", "5432")),
        "database": args.db or os.getenv("APP_CONFIG__DB__NAME", "talent"),
        "user": args.user or os.getenv("APP_CONFIG__DB__USER", "admin"),
        "password": args.password or os.getenv("APP_CONFIG__DB__PASSWORD", "admin12345"),
    }


COLUMNS_SQL = """
SELECT table_name || '|' || column_name || '|' || data_type
       || '|null=' || is_nullable
       || '|default=' || COALESCE(column_default, '')
FROM information_schema.columns
WHERE table_schema = 'public'
ORDER BY table_name, column_name;
"""

FK_SQL = """
SELECT tc.table_name || '.' || kcu.column_name || ' -> '
       || ccu.table_name || '.' || ccu.column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage ccu
  ON ccu.constraint_name = tc.constraint_name AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public'
ORDER BY 1;
"""

INDEX_SQL = """
SELECT tablename || '|' || indexname || '|' || indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;
"""

ENUM_SQL = """
SELECT t.typname || '|' || string_agg(e.enumlabel, ',' ORDER BY e.enumsortorder)
FROM pg_type t
JOIN pg_enum e ON e.enumtypid = t.oid
GROUP BY t.typname
ORDER BY t.typname;
"""


async def fetch_block(conn: asyncpg.Connection, sql: str) -> list[str]:
    rows = await conn.fetch(sql)
    # each row is a single concatenated text column
    return [r[0] for r in rows]


async def main() -> int:
    ap = argparse.ArgumentParser(description="Dump compact Postgres schema snapshot.")
    ap.add_argument("--host")
    ap.add_argument("--port")
    ap.add_argument("--db")
    ap.add_argument("--user")
    ap.add_argument("--password")
    ap.add_argument("--out", default=str(DEFAULT_OUT))
    args = ap.parse_args()

    load_env()
    params = conn_params(args)

    try:
        conn = await asyncpg.connect(**params)
    except Exception as exc:  # noqa: BLE001
        print(
            f"Could not connect to Postgres at {params['host']}:{params['port']} "
            f"db={params['database']} user={params['user']}.\n  {exc}",
            file=sys.stderr,
        )
        return 1

    try:
        lines: list[str] = [
            "# TALENT schema snapshot",
            f"# host={params['host']}:{params['port']} db={params['database']} "
            f"generated={datetime.now(timezone.utc).isoformat()}",
            "# sorted alphabetically; diff this file between TL and TLW.",
            "",
            "## COLUMNS (table|column|type|null|default)",
            *await fetch_block(conn, COLUMNS_SQL),
            "",
            "## FOREIGN KEYS (table.col -> ref_table.ref_col)",
            *await fetch_block(conn, FK_SQL),
            "",
            "## INDEXES (table|index|def)",
            *await fetch_block(conn, INDEX_SQL),
            "",
            "## ENUMS (type|labels)",
            *await fetch_block(conn, ENUM_SQL),
        ]
    finally:
        await conn.close()

    out_path = Path(args.out)
    out_path.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"Schema snapshot written to: {out_path}")
    print(f"Lines: {len(lines)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))

"""Import / restore the talent database from the local JSON backup.

MANUAL EMERGENCY USE ONLY — this clears and repopulates tables. It is never
called by the app; run it yourself after the DB has been recreated.

By default it restores BOTH backup files written by ``dump_table_data.py``:

    translations_data.json   (langs, msg_keys, msgs)
    main_data.json           (every other data table)

Both files are merged and loaded inside a **single transaction** so the restore
is atomic. ``employee_photos`` and ``alembic_version`` are absent from the
files on purpose (photos are re-grabbed via ``backend/scripts/grab_employee_photos.py``;
the schema/migration head must already exist — run ``alembic upgrade head`` first).

Conflict policy: **the file always wins.** Each target table is cleared
(``DELETE``) and then repopulated from the file, so existing rows are replaced.

How foreign keys are handled
----------------------------
The load runs with ``session_replication_role = 'replica'``, which disables FK
trigger enforcement for the session. This lets us clear/insert without worrying
about cross-file order *and* without FK violations from tables that are NOT in
the files but reference tables that are: rows are reinserted with their original
``id`` values, so external references stay valid. Setting
``session_replication_role`` requires a superuser role (the default ``admin``
role in the docker compose setup is one).

Tables are still processed in FK-dependency order (parents before children),
derived from the ``foreign_keys`` metadata in the dump, and sequences are
resynced afterwards.

Run from the project root::

    python -m backend.utils.table_data.import_table_data
    python -m backend.utils.table_data.import_table_data main_data.json   # one file only
"""

from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Any

PROJECT_ROOT = Path(__file__).resolve().parents[3]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from backend.database.db_helper import db_helper
from psycopg2.extras import Json
from sqlalchemy import inspect, text

HERE = Path(__file__).resolve().parent
# Order matters only for readability — FK enforcement is disabled during load.
# Translations first (no FK into main), then main (references langs).
DEFAULT_FILES = ["translations_data.json", "main_data.json"]


def _topo_order(tables: dict[str, Any], present: set[str]) -> list[str]:
    """Return table names ordered so every table comes after the tables it
    references via FK. Self-references and FKs to absent tables are ignored."""
    deps: dict[str, set[str]] = {name: set() for name in tables}
    for name, meta in tables.items():
        for fk in meta.get("foreign_keys", []):
            ref_table = fk["references"].split(".", 1)[0]
            if ref_table != name and ref_table in present:
                deps[name].add(ref_table)

    ordered: list[str] = []
    placed: set[str] = set()
    # Stable deterministic ordering; loop until all placed.
    remaining = list(tables.keys())
    while remaining:
        progressed = False
        for name in list(remaining):
            if deps[name] <= placed:
                ordered.append(name)
                placed.add(name)
                remaining.remove(name)
                progressed = True
        if not progressed:
            # Cyclic / unresolved FKs — append the rest as-is (FK enforcement is
            # disabled during the load anyway).
            print(f"[warn] unresolved FK ordering for: {remaining}")
            ordered.extend(remaining)
            break
    return ordered


def _json_columns(conn) -> dict[str, set[str]]:
    """Return {table_name: {col, ...}} for every json/jsonb column (public schema).

    These columns need their values wrapped with psycopg2's ``Json`` on insert,
    otherwise a Python dict/list/bool/int/str lands in a ``json`` column as the
    wrong type (``can't adapt type 'dict'`` / ``column ... is of type json but
    expression is of type boolean``).
    """
    rows = conn.execute(
        text(
            "SELECT table_name, column_name FROM information_schema.columns "
            "WHERE table_schema = 'public' AND data_type IN ('json', 'jsonb')"
        )
    )
    result: dict[str, set[str]] = {}
    for table_name, column_name in rows:
        result.setdefault(table_name, set()).add(column_name)
    return result


def _insert_rows(
    conn,
    table: str,
    columns: list[str],
    rows: list[dict[str, Any]],
    json_cols: set[str] | None = None,
) -> int:
    if not rows:
        return 0
    json_cols = json_cols or set()
    cols = ", ".join(f'"{c}"' for c in columns)
    params = ", ".join(f":{c}" for c in columns)
    stmt = text(f'INSERT INTO "{table}" ({cols}) VALUES ({params})')

    # Normalise each row to exactly the column set (missing -> None). Values for
    # json/jsonb columns (or any nested dict/list) are wrapped with Json(); None
    # is left as SQL NULL.
    def _adapt(col: str, value):
        if value is None:
            return None
        if col in json_cols or isinstance(value, (dict, list)):
            return Json(value)
        return value

    payload = [{c: _adapt(c, row.get(c)) for c in columns} for row in rows]
    conn.execute(stmt, payload)
    return len(payload)


def _resync_sequence(conn, table: str, columns: list[str]) -> None:
    """Reset the id sequence to MAX(id) so future inserts don't collide."""
    if "id" not in columns:
        return
    seq = conn.execute(
        text("SELECT pg_get_serial_sequence(:t, 'id')"), {"t": table}
    ).scalar()
    if not seq:
        return
    conn.execute(
        text(
            f"SELECT setval('{seq}', "
            f'COALESCE((SELECT MAX("id") FROM "{table}"), 1), '
            f'(SELECT COUNT(*) FROM "{table}") > 0)'
        )
    )


def _load_tables(path: Path) -> dict[str, Any]:
    """Read one dump file and return its ``tables`` mapping."""
    payload = json.loads(path.read_text(encoding="utf-8"))
    return payload.get("tables", {})


def import_files(paths: list[Path]) -> None:
    """Restore the merged contents of the given dump files (file data wins)."""
    merged: dict[str, Any] = {}
    for path in paths:
        if not path.exists():
            print(f"[warn] file not found, skipping: {path}")
            continue
        tables = _load_tables(path)
        merged.update(tables)  # table names are disjoint across the two files
        print(f"Loaded {len(tables)} tables from {path.name}")

    if not merged:
        print("Nothing to import — no tables found in the given files.")
        return

    engine = db_helper.sync_engine
    existing = set(inspect(engine).get_table_names())

    target = {n: m for n, m in merged.items() if n in existing}
    skipped = [n for n in merged if n not in existing]
    if skipped:
        print(f"[warn] skipping tables not in current DB: {skipped}")

    order = _topo_order(target, set(target))
    print(f"\nImporting {len(order)} tables (file data wins)\n")

    with engine.begin() as conn:
        # Disable FK enforcement for this session/transaction.
        conn.execute(text("SET session_replication_role = 'replica'"))

        # json/jsonb columns need Json()-wrapped values on insert.
        json_cols = _json_columns(conn)

        # 1) Clear target tables (children first).
        for name in reversed(order):
            conn.execute(text(f'DELETE FROM "{name}"'))

        # 2) Insert file rows (parents first).
        total = 0
        for name in order:
            meta = target[name]
            inserted = _insert_rows(
                conn, name, meta["columns"], meta["rows"], json_cols.get(name, set())
            )
            total += inserted
            _resync_sequence(conn, name, meta["columns"])
            print(f"  {name:<45} {inserted:>6} rows")

        # Restore normal FK enforcement before commit.
        conn.execute(text("SET session_replication_role = 'origin'"))

    print(f"\nDone. Inserted {total} rows into {len(order)} tables.")


def _resolve(fname: str) -> Path:
    path = Path(fname)
    return path if path.is_absolute() else HERE / fname


if __name__ == "__main__":
    files = sys.argv[1:] if len(sys.argv) > 1 else DEFAULT_FILES
    import_files([_resolve(f) for f in files])

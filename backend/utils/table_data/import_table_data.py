"""Import / restore the talent database from a JSON dump.

Reads a dump produced by ``dump_table_data.py`` (default: ``table_data_2.json``)
and loads every table into the *current* database.

Conflict policy: **the file always wins.** Each target table is cleared
(``DELETE``) and then repopulated from the file, so existing rows are replaced
by the file's rows.

How foreign keys are handled
----------------------------
The whole load runs inside a single transaction with
``session_replication_role = 'replica'``, which disables FK trigger enforcement
for the session. This lets us clear/insert tables without worrying about insert
order *and* without FK violations from tables that are NOT in the file but
reference tables that are (e.g. ``review_*`` rows pointing at ``employees``):
because rows are reinserted with their original ``id`` values, those external
references stay valid. Setting ``session_replication_role`` requires a superuser
role (the default ``admin`` role in the docker compose setup is one).

Tables are still processed in FK-dependency order (parents before children),
derived from the ``foreign_keys`` metadata in the dump, and sequences are
resynced afterwards.

Run from the project root::

    python -m backend.utils.table_data.import_table_data
    python -m backend.utils.table_data.import_table_data table_data_2.json
"""

from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Any

PROJECT_ROOT = Path(__file__).resolve().parents[3]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from sqlalchemy import inspect, text

from backend.database.db_helper import db_helper

DEFAULT_FILE = "table_data_2.json"


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


def _insert_rows(conn, table: str, columns: list[str], rows: list[dict[str, Any]]) -> int:
    if not rows:
        return 0
    cols = ", ".join(f'"{c}"' for c in columns)
    params = ", ".join(f":{c}" for c in columns)
    stmt = text(f'INSERT INTO "{table}" ({cols}) VALUES ({params})')
    # Normalise each row to exactly the column set (missing -> None).
    payload = [{c: row.get(c) for c in columns} for row in rows]
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


def import_data(file_path: Path) -> None:
    payload = json.loads(file_path.read_text(encoding="utf-8"))
    tables: dict[str, Any] = payload["tables"]

    engine = db_helper.sync_engine
    existing = set(inspect(engine).get_table_names())

    target = {n: m for n, m in tables.items() if n in existing}
    skipped = [n for n in tables if n not in existing]
    if skipped:
        print(f"[warn] skipping tables not in current DB: {skipped}")

    order = _topo_order(target, set(target))
    print(f"Importing {len(order)} tables from {file_path.name} (file data wins)\n")

    with engine.begin() as conn:
        # Disable FK enforcement for this session/transaction.
        conn.execute(text("SET session_replication_role = 'replica'"))

        # 1) Clear target tables (children first).
        for name in reversed(order):
            conn.execute(text(f'DELETE FROM "{name}"'))

        # 2) Insert file rows (parents first).
        total = 0
        for name in order:
            meta = target[name]
            inserted = _insert_rows(conn, name, meta["columns"], meta["rows"])
            total += inserted
            _resync_sequence(conn, name, meta["columns"])
            print(f"  {name:<45} {inserted:>6} rows")

        # Restore normal FK enforcement before commit.
        conn.execute(text("SET session_replication_role = 'origin'"))

    print(f"\nDone. Inserted {total} rows into {len(order)} tables.")


if __name__ == "__main__":
    fname = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_FILE
    path = Path(fname)
    if not path.is_absolute():
        path = Path(__file__).resolve().parent / fname
    import_data(path)

"""Dump the talent database into JSON files for local backup / restore.

The script connects to the configured PostgreSQL database, reflects the full
schema straight from the live database (so association/link tables are captured
too), then serialises the rows of each table into **two** JSON files next to
this one, plus a manifest with per-table row counts:

* ``translations_data.json`` — ``langs``, ``msg_keys``, ``msgs`` (the
  translation bundle).
* ``main_data.json``         — every other data table.
* ``restore_manifest.json``  — ``row_counts`` per table, the file each table
  belongs to, and totals. The db_tables dev page reads this to show
  ``qtyRecordsToRestore`` and its delta against the live row counts.

Tables are written FK-parents-first (``metadata.sorted_tables``) and rows keep
their original ``id`` values so the dump restores cleanly.

Excluded on purpose
-------------------
* ``alembic_version`` — schema/migration state, not data. Re-inserting a dumped
  ``version_num`` could silently move the migration head. Restore assumes the
  schema already exists (``alembic upgrade head``).
* ``employee_photos`` — binary ``bytea`` blobs; repopulated after a restore via
  ``backend/scripts/grab_employee_photos.py``.

Run from the project root::

    python -m backend.utils.table_data.dump_table_data

or directly::

    python backend/utils/table_data/dump_table_data.py
"""

from __future__ import annotations

import json
import sys
import uuid
from datetime import date, datetime, time, timedelta
from decimal import Decimal
from pathlib import Path
from typing import Any

# Make ``backend.*`` importable when the file is run directly (not as a module).
PROJECT_ROOT = Path(__file__).resolve().parents[3]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from sqlalchemy import MetaData, create_engine, select

from backend.config import settings

# Importing the api_v1 package registers every ORM model on ``Base.metadata``.
# It is not strictly required because we reflect the live database below, but it
# keeps the ORM metadata loaded and surfaces import errors early.
try:
    import backend.api_v1  # noqa: F401
except Exception as exc:  # pragma: no cover - best effort, reflection still works
    print(f"[warn] could not import backend.api_v1 models: {exc}")

OUTPUT_DIR = Path(__file__).resolve().parent

# Tables that go into the translation bundle file (the rest go to main).
TRANSLATION_TABLES = {"langs", "msg_keys", "msgs"}
TRANSLATIONS_FILE = "translations_data.json"
MAIN_FILE = "main_data.json"
MANIFEST_FILE = "restore_manifest.json"

# Never dumped — schema state / binary blobs handled elsewhere.
EXCLUDED_TABLES = {"alembic_version", "employee_photos"}


def _sync_url() -> str:
    """Return a synchronous (psycopg2) DB URL.

    ``settings.db.active_url`` yields an asyncpg URL; the seeds/migrations use
    psycopg2 for synchronous access (the Windows workaround in ``migrations/env.py``),
    so we mirror that here.
    """
    return settings.db.active_url.replace(
        "postgresql+asyncpg://", "postgresql+psycopg2://"
    )


def _json_default(value: Any) -> Any:
    """Serialise database values that JSON cannot handle natively."""
    if isinstance(value, (datetime, date, time)):
        return value.isoformat()
    if isinstance(value, timedelta):
        return value.total_seconds()
    if isinstance(value, Decimal):
        # str() preserves precision; float() would round.
        return str(value)
    if isinstance(value, uuid.UUID):
        return str(value)
    if isinstance(value, (bytes, bytearray, memoryview)):
        return bytes(value).hex()
    if isinstance(value, set):
        return list(value)
    return str(value)


def _table_payload(conn, table) -> dict[str, Any]:
    """Serialise one table's structure + rows into the dump shape."""
    columns = [col.name for col in table.columns]
    foreign_keys = [
        {
            "column": fk.parent.name,
            "references": f"{fk.column.table.name}.{fk.column.name}",
        }
        for fk in table.foreign_keys
    ]
    primary_key = [col.name for col in table.primary_key.columns]
    rows = [dict(row._mapping) for row in conn.execute(select(table))]
    return {
        "columns": columns,
        "primary_key": primary_key,
        "foreign_keys": foreign_keys,
        "row_count": len(rows),
        "rows": rows,
    }


def _write_json(path: Path, payload: dict[str, Any]) -> None:
    path.write_text(
        json.dumps(payload, default=_json_default, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )


def dump_to_files(output_dir: Path | None = None) -> dict[str, Any]:
    """Dump the live DB into the translation + main files and a manifest.

    Returns the manifest dict (also written to ``restore_manifest.json``).
    """
    out_dir = Path(output_dir) if output_dir else OUTPUT_DIR
    out_dir.mkdir(parents=True, exist_ok=True)

    engine = create_engine(_sync_url(), poolclass=None)
    metadata = MetaData()

    print(
        f"Reflecting schema from {engine.url.render_as_string(hide_password=True)} ..."
    )
    metadata.reflect(bind=engine)

    # ``sorted_tables`` orders by FK dependency (parents before children).
    all_tables = [t for t in metadata.sorted_tables if t.name not in EXCLUDED_TABLES]

    translation_tables = [t for t in all_tables if t.name in TRANSLATION_TABLES]
    main_tables = [t for t in all_tables if t.name not in TRANSLATION_TABLES]

    translations_payload: dict[str, Any] = {"tables": {}}
    main_payload: dict[str, Any] = {"tables": {}}
    row_counts: dict[str, int] = {}

    with engine.connect() as conn:
        for table in translation_tables:
            data = _table_payload(conn, table)
            translations_payload["tables"][table.name] = data
            row_counts[table.name] = data["row_count"]
            print(f"  [translations] {table.name:<35} {data['row_count']:>6} rows")
        for table in main_tables:
            data = _table_payload(conn, table)
            main_payload["tables"][table.name] = data
            row_counts[table.name] = data["row_count"]
            print(f"  [main]         {table.name:<35} {data['row_count']:>6} rows")

    engine.dispose()

    generated_at = datetime.now().isoformat()
    database = create_engine(_sync_url()).url.database

    for payload in (translations_payload, main_payload):
        payload["generated_at"] = generated_at
        payload["database"] = database

    _write_json(out_dir / TRANSLATIONS_FILE, translations_payload)
    _write_json(out_dir / MAIN_FILE, main_payload)

    total_rows = sum(row_counts.values())
    manifest: dict[str, Any] = {
        "generated_at": generated_at,
        "database": database,
        "table_count": len(row_counts),
        "total_rows": total_rows,
        "excluded_tables": sorted(EXCLUDED_TABLES),
        "files": {
            TRANSLATIONS_FILE: [t.name for t in translation_tables],
            MAIN_FILE: [t.name for t in main_tables],
        },
        "row_counts": row_counts,
    }
    _write_json(out_dir / MANIFEST_FILE, manifest)

    print(
        f"\nWrote {total_rows} rows from {len(row_counts)} tables to "
        f"{TRANSLATIONS_FILE} + {MAIN_FILE} (manifest: {MANIFEST_FILE}) in {out_dir}"
    )
    return manifest


if __name__ == "__main__":
    dump_to_files()

"""Dump every table in the talent database into a single JSON file.

The script connects to the configured PostgreSQL database, reflects the full
schema straight from the live database (so *every* table is captured, including
association/link tables and alembic's ``alembic_version``), then serialises the
rows of each table into ``table_data.json`` next to this file.

Table structure and relationships are defined by the SQLAlchemy ``*_model.py``
files (registered on ``Base.metadata``); importing ``backend.api_v1`` makes the
ORM-declared tables available, but we additionally reflect the database so the
dump never depends on the import list staying in sync.

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

OUTPUT_FILE = Path(__file__).resolve().parent / "table_data.json"


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


def dump() -> None:
    engine = create_engine(_sync_url(), poolclass=None)
    metadata = MetaData()

    print(f"Reflecting schema from {engine.url.render_as_string(hide_password=True)} ...")
    metadata.reflect(bind=engine)

    # ``sorted_tables`` orders by FK dependency (parents before children).
    tables = metadata.sorted_tables
    print(f"Found {len(tables)} tables.")

    export: dict[str, Any] = {
        "generated_at": datetime.now().isoformat(),
        "database": engine.url.database,
        "table_count": len(tables),
        "tables": {},
    }

    with engine.connect() as conn:
        for table in tables:
            columns = [col.name for col in table.columns]
            foreign_keys = [
                {
                    "column": fk.parent.name,
                    "references": f"{fk.column.table.name}.{fk.column.name}",
                }
                for fk in table.foreign_keys
            ]
            primary_key = [col.name for col in table.primary_key.columns]

            rows = [
                dict(row._mapping)
                for row in conn.execute(select(table))
            ]

            export["tables"][table.name] = {
                "columns": columns,
                "primary_key": primary_key,
                "foreign_keys": foreign_keys,
                "row_count": len(rows),
                "rows": rows,
            }
            print(f"  {table.name:<45} {len(rows):>6} rows")

    engine.dispose()

    OUTPUT_FILE.write_text(
        json.dumps(export, default=_json_default, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    total_rows = sum(t["row_count"] for t in export["tables"].values())
    print(f"\nWrote {total_rows} rows from {len(tables)} tables to {OUTPUT_FILE}")


if __name__ == "__main__":
    dump()

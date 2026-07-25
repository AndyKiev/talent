"""JSON file repository for db_table_info.

Reads/writes backend/db_table_info.json — no database involvement.
"""

import json
from pathlib import Path

from backend.api_v1.db_table_info.db_table_info_messages import (
    DbTableInfoFileError,
)
from backend.api_v1.db_table_info.db_table_info_schema import (
    DbTableInfo,
    TableDataFile,
)

# JSON file lives next to the backend package root.
_JSON_PATH = Path(__file__).resolve().parents[2] / "db_table_info.json"


class DbTableInfoRepository:
    """File-backed storage for db_table_info records."""

    def __init__(self) -> None:
        self._file_path = _JSON_PATH

    # ── low-level I/O ──────────────────────────────────────────────────────

    def _read_raw(self) -> dict:
        if not self._file_path.exists():
            return {"tables": []}
        try:
            return json.loads(self._file_path.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError) as exc:
            raise DbTableInfoFileError(str(exc))

    def _write_raw(self, data: dict) -> None:
        try:
            self._file_path.parent.mkdir(parents=True, exist_ok=True)
            self._file_path.write_text(
                json.dumps(data, ensure_ascii=False, indent=2, default=str),
                encoding="utf-8",
            )
        except OSError as exc:
            raise DbTableInfoFileError(str(exc))

    # ── load / save parsed records ─────────────────────────────────────────

    def load_all(self) -> TableDataFile:
        raw = self._read_raw()
        return TableDataFile.model_validate(raw)

    def save_all(self, data: TableDataFile) -> None:
        self._write_raw(data.model_dump())

    # ── single-record helpers ──────────────────────────────────────────────

    def get_by_table_name(self, table_name: str) -> DbTableInfo | None:
        data = self.load_all()
        for t in data.tables:
            if t.table_name == table_name:
                return t
        return None

    def upsert(self, record: DbTableInfo) -> None:
        """Insert or replace a single table record."""
        data = self.load_all()
        for i, t in enumerate(data.tables):
            if t.table_name == record.table_name:
                data.tables[i] = record
                self.save_all(data)
                return
        # not found — append
        data.tables.append(record)
        self.save_all(data)

    def delete(self, table_name: str) -> None:
        """Remove a table record if it exists; no-op otherwise."""
        data = self.load_all()
        new_tables = [t for t in data.tables if t.table_name != table_name]
        if len(new_tables) == len(data.tables):
            return  # nothing removed — not an error
        data.tables = new_tables
        self.save_all(data)

    def replace_all(self, records: list[DbTableInfo]) -> None:
        """Replace the entire table list atomically."""
        self._write_raw(TableDataFile(tables=records).model_dump())

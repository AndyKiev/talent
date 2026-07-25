"""Pydantic schemas for the db_table_info JSON-backed essence.

No SQLAlchemy model — data lives in a JSON file on disk.
"""


from pydantic import BaseModel, Field


class FkRef(BaseModel):
    """Foreign-key target."""

    table: str
    column: str


class ColumnInfo(BaseModel):
    """One column of a database table."""

    name: str
    data_type: str
    nullable: bool = True
    is_primary_key: bool = False
    is_foreign_key: bool = False
    fk_ref: FkRef | None = None
    max_length: int | None = None


class TableStats(BaseModel):
    """Snapshot of row count and disk size for one point in time."""

    row_count: int = 0
    size_bytes: int = 0
    size_pretty: str = ""


class DbTableInfo(BaseModel):
    """Full record for one database table (as stored in the JSON file)."""

    table_name: str
    sort_order: int = 0
    description_ru: str = ""
    sample_limit: int = 30
    columns: list[ColumnInfo] = Field(default_factory=list)
    current: TableStats = Field(default_factory=TableStats)
    previous: TableStats = Field(default_factory=TableStats)
    # Row count for this table in the latest local backup (restore_manifest.json).
    # Display-only: re-stamped from the manifest on every read, never trusted
    # from db_table_info.json.
    restore_row_count: int = 0


class DbTableInfoUpdate(BaseModel):
    """Fields that the frontend can update directly."""

    description_ru: str | None = None
    sort_order: int | None = None
    sample_limit: int | None = None


class TableRowsResponse(BaseModel):
    """A slice of live rows from a database table."""

    columns: list[str]
    column_meta: list[ColumnInfo]  # metadata for each column (PK, FK, type, etc.)
    rows: list[list]  # each inner list is one row of scalar values
    total_available: int  # COUNT(*) of the whole table


class ReorderRequest(BaseModel):
    """Payload for reordering tables."""

    ordered_table_names: list[str]


class ColumnPref(BaseModel):
    """Per-column display preference (persisted in the JSON file)."""

    field: str
    hidden: bool = False
    sortable: bool = True
    filterable: bool = True
    width: int | None = None  # pixel width; None = auto


class ColumnPrefsUpdate(BaseModel):
    """Payload to replace the full column_prefs list."""

    prefs: list[ColumnPref]


class RowUpdateRequest(BaseModel):
    """Update a single row in a table identified by its PK."""

    pk: dict[str, object]  # {"id": 5} or {"department_id": 3, "employee_id": 7}
    data: dict[str, object]  # {"name": "new value"}


class RowDeleteRequest(BaseModel):
    """Delete a single row identified by its PK."""

    pk: dict[str, object]


class TableDataFile(BaseModel):
    """Root structure of the JSON file on disk."""

    tables: list[DbTableInfo] = Field(default_factory=list)
    column_prefs: list[ColumnPref] = Field(default_factory=list)


class BackupResult(BaseModel):
    """Summary returned after writing the local backup files."""

    generated_at: str
    total_rows: int
    table_count: int
    files: dict[str, list[str]]  # {filename: [table_name, ...]}

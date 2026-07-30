"""Compute old + new constraint/index names for a hand-written rename migration.

Why this exists
---------------
A pure table/column rename is hand-written (see the vault's [[Hand Written Rename
Migration]]), and the hard part is NOT `op.rename_table` -- it is the constraint and
index names. Postgres keeps the old names through a table rename, so unless every one
of them is renamed too, autogenerate reports drift forever.

Two traps make that impossible to do by hand:

1. Names come from the project naming convention in `backend/config/database.py`
   (`fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s`), which embeds BOTH
   table names and easily runs past 63 bytes.
2. Anything past 63 bytes is truncated by SQLAlchemy -- not by simple clipping, but as
   `name[:55] + "_" + md5(name)[-4:]`. That hashed name is what lives in the database.
   A migration that spells out the untruncated name fails at runtime.

So this script reads the live model metadata, renders each name the way SQLAlchemy
does, and prints the exact (old -> new) pairs to paste into the migration.

Usage
-----
    python scripts/naming/gen_rename_names.py

Edit TABLE_RENAMES / COLUMN_RENAMES below for the rename you are performing. Output is
Python source: the CONSTRAINTS / INDEXES lists the migration consumes. Read-only -- it
touches no database and writes no files.
"""

from __future__ import annotations

import hashlib
import os
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO_ROOT))

from dotenv import load_dotenv  # noqa: E402

load_dotenv(REPO_ROOT / ".env")
os.environ.setdefault("BYPASS_LDAP", "true")

import backend.api_v1  # noqa: F401,E402  -- registers every model on the metadata
from backend.api_v1.base.base_model import Base  # noqa: E402

# --- the rename being performed -------------------------------------------------

# (old_table, new_table)
# NOTE: this map is the LAST rename performed (revision c7e1a94f5b30), kept as a worked
# example. Replace both lists for the next rename; the pre-rename names must be the ones
# still present in the models when the script runs.
TABLE_RENAMES: list[tuple[str, str]] = [
    ("candidates", "recruitment_candidates"),
    ("candidate_sources", "recruitment_candidate_sources"),
    ("candidate_phones", "recruitment_candidate_phones"),
    ("candidate_notes", "recruitment_candidate_notes"),
    ("candidate_applications", "recruitment_applications"),
    ("pipeline_statuses", "recruitment_application_statuses"),
    ("application_status_history", "recruitment_application_status_changes"),
    ("interviews", "recruitment_interviews"),
    ("interview_interviewers", "recruitment_interview_interviewers"),
    ("interview_feedbacks", "recruitment_interview_feedbacks"),
]

# (old_table, old_column, new_column) -- old_table is the pre-rename table name
COLUMN_RENAMES: list[tuple[str, str, str]] = [
    ("recruitment_tasks", "requirement_group_id", "job_requirement_group_id"),
    ("candidates", "source_id", "candidate_source_id"),
    ("candidate_notes", "author_id", "created_by"),
    ("interview_feedbacks", "author_id", "created_by"),
    ("application_status_history", "changed_by", "created_by"),
    ("application_status_history", "changed_at", "created_at"),
]

MAX_IDENTIFIER_LENGTH = 63  # Postgres

# --- name rendering -------------------------------------------------------------


def truncate(name: str, max_len: int = MAX_IDENTIFIER_LENGTH) -> str:
    """Reproduce SQLAlchemy's `_truncated_label` behaviour exactly.

    sqlalchemy/sql/compiler.py -> IdentifierPreparer.truncate_and_render_*:
    keep max_len - 8 characters, then "_" plus the last 4 hex digits of the md5 of
    the FULL name. Deterministic, so the value here matches the database.
    """
    if len(name) <= max_len:
        return name
    return name[: max_len - 8] + "_" + hashlib.md5(name.encode()).hexdigest()[-4:]


TABLE_MAP = dict(TABLE_RENAMES)
COLUMN_MAP = {(t, c): new for t, c, new in COLUMN_RENAMES}


def new_table(table: str) -> str:
    return TABLE_MAP.get(table, table)


def new_column(table: str, column: str) -> str:
    return COLUMN_MAP.get((table, column), column)


def render(kind: str, table: str, columns: list[str], referred: str | None) -> str:
    """Render a constraint/index name from the project naming convention."""
    if kind == "pk":
        return f"pk_{table}"
    if kind == "fk":
        return f"fk_{table}_{columns[0]}_{referred}"
    if kind == "uq":
        return f"uq_{table}_{'_'.join(columns)}"
    if kind == "ix":
        # ix_%(column_0_label)s -- the label is <table>_<column>
        return f"ix_{table}_{columns[0]}"
    raise ValueError(kind)


# --- walk the metadata ----------------------------------------------------------


def collect() -> tuple[list[tuple[str, str, str]], list[tuple[str, str]]]:
    constraints: list[tuple[str, str, str]] = []
    indexes: list[tuple[str, str]] = []

    for old_name in TABLE_MAP:
        table = Base.metadata.tables.get(old_name)
        if table is None:
            print(
                f"  # WARNING: {old_name} not found on the metadata "
                f"(already renamed in the models?)",
                file=sys.stderr,
            )
            continue

        target = new_table(old_name)
        rows: list[tuple[str, str, str, list[str], str | None]] = []

        # primary key
        if table.primary_key is not None and table.primary_key.columns:
            rows.append(("pk", old_name, "", [], None))

        # unique constraints
        from sqlalchemy import ForeignKeyConstraint, UniqueConstraint

        for con in sorted(table.constraints, key=lambda c: c.name or ""):
            if isinstance(con, UniqueConstraint):
                rows.append(
                    (
                        "uq",
                        old_name,
                        con.name or "",
                        [c.name for c in con.columns],
                        None,
                    )
                )
            elif isinstance(con, ForeignKeyConstraint):
                referred = list(con.elements)[0].column.table.name
                rows.append(
                    (
                        "fk",
                        old_name,
                        con.name or "",
                        [c.name for c in con.columns],
                        referred,
                    )
                )

        for kind, tbl, declared, cols, referred in rows:
            # An explicitly named constraint (declared in __table_args__) does not follow
            # the convention -- carry the author's name through, renamed by hand.
            if kind == "uq" and declared and not declared.startswith(f"uq_{tbl}"):
                old = declared
                new = declared.replace(
                    "candidate_application", "recruitment_application"
                )
                new = new.replace(
                    "interview_interviewer", "recruitment_interview_interviewer"
                )
            else:
                old = render(kind, tbl, cols, referred)
                new = render(
                    kind,
                    target,
                    [new_column(tbl, c) for c in cols],
                    new_table(referred) if referred else None,
                )
            if truncate(old) != truncate(new):
                constraints.append((target, truncate(old), truncate(new)))

        # plain indexes
        for idx in sorted(table.indexes, key=lambda i: i.name or ""):
            cols = [c.name for c in idx.columns]
            old = render("ix", old_name, cols, None)
            new = render("ix", target, [new_column(old_name, c) for c in cols], None)
            if truncate(old) != truncate(new):
                indexes.append((truncate(old), truncate(new)))

    # Column renames on tables that are NOT themselves renamed still move their
    # constraint names (the column is part of the name).
    renamed_tables = set(TABLE_MAP)
    for tbl, col, _new_col in COLUMN_RENAMES:
        if tbl in renamed_tables:
            continue
        table = Base.metadata.tables.get(tbl)
        if table is None:
            continue
        from sqlalchemy import ForeignKeyConstraint

        for con in table.constraints:
            if not isinstance(con, ForeignKeyConstraint):
                continue
            cols = [c.name for c in con.columns]
            if col not in cols:
                continue
            referred = list(con.elements)[0].column.table.name
            old = render("fk", tbl, cols, referred)
            new = render(
                "fk", tbl, [new_column(tbl, c) for c in cols], new_table(referred)
            )
            if truncate(old) != truncate(new):
                constraints.append((tbl, truncate(old), truncate(new)))

    return constraints, indexes


def main() -> None:
    constraints, indexes = collect()

    print("# Generated by scripts/naming/gen_rename_names.py -- do not hand-edit.")
    print("# (table, old, new) -- primary keys, unique and foreign key constraints.")
    print("CONSTRAINTS = [")
    for table, old, new in constraints:
        print(f'    ("{table}", "{old}", "{new}"),')
    print("]")
    print()
    print("# (old, new) -- plain (non-constraint) indexes")
    print("INDEXES = [")
    for old, new in indexes:
        print(f'    ("{old}", "{new}"),')
    print("]")
    print()
    print(f"# {len(constraints)} constraints, {len(indexes)} indexes", file=sys.stderr)

    over = [
        (t, n) for t, _o, n in constraints if len(n) == MAX_IDENTIFIER_LENGTH - 8 + 5
    ]
    if over:
        print(
            f"# NOTE: {len(over)} new names were hash-truncated past "
            f"{MAX_IDENTIFIER_LENGTH} bytes.",
            file=sys.stderr,
        )


if __name__ == "__main__":
    main()

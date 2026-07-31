"""encrypt person names, patronymic, child birth dates; add name blind index

Revision ID: 9c9d1b567415
Revises: 994c39dcd868
Create Date: 2026-07-31 11:56:39.624168

Encrypting `persons.first_name` / `last_name` is not just a type change: two
things in SQL depended on reading those columns, and both had to move first.

  * the UNIQUE constraint (last_name, first_name, name_dedupe_no) — randomized
    ciphertext differs per row, so the constraint would never fire again. It is
    replaced by a constraint over the deterministic blind index.
  * the two namesake lookups (`find_by_normalized_name`, `get_next_dedupe_no`)
    — replaced by an equality match on that same index.

**Step order is load-bearing.** `name_hash` is computed from the PLAINTEXT
names, so it must be backfilled BEFORE the columns are encrypted. The other way
round would hash ciphertext, and since ciphertext is random every person would
get a unique hash — silently disabling namesake detection forever while looking
perfectly healthy.

Re-runnable: `is_encrypted()` skips rows already converted.
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

from backend.utils.crypto.blind_index import name_blind_index
from backend.utils.crypto.cipher import decrypt, encrypt, is_encrypted
from backend.utils.crypto.types import EncryptedDate, EncryptedString

# revision identifiers, used by Alembic.
revision: str = "9c9d1b567415"
down_revision: Union[str, Sequence[str], None] = "994c39dcd868"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

_PERSON_TEXT_COLUMNS = ("first_name", "last_name", "patronymic")
_TARGETS = (
    ("persons", "first_name"),
    ("persons", "last_name"),
    ("persons", "patronymic"),
    ("employee_children", "birth_date"),
)


def _transform_rows(table: str, column: str, fn) -> int:
    """Apply `fn` to every non-null value of one column. The transform only
    exists in Python (Fernet / HMAC), so this cannot be a single UPDATE."""
    bind = op.get_bind()
    rows = bind.execute(
        sa.text(f"SELECT id, {column} FROM {table} WHERE {column} IS NOT NULL")
    ).fetchall()
    changed = 0
    for row_id, value in rows:
        new_value = fn(value)
        if new_value == value:
            continue
        bind.execute(
            sa.text(f"UPDATE {table} SET {column} = :v WHERE id = :id"),
            {"v": new_value, "id": row_id},
        )
        changed += 1
    return changed


def upgrade() -> None:
    bind = op.get_bind()

    # 1) Drop the constraint that reads the plaintext names.
    op.drop_constraint("uq_persons_last_first_dedupe", "persons", type_="unique")

    # 2) Add the blind index, nullable for now — there is nothing in it yet.
    op.add_column(
        "persons", sa.Column("name_hash", sa.String(length=64), nullable=True)
    )

    # 3) Widen the columns. Ciphertext does not fit in the old varchar(64), and
    #    a date column cannot hold text at all.
    for column in _PERSON_TEXT_COLUMNS:
        op.alter_column(
            "persons",
            column,
            existing_type=sa.VARCHAR(length=64),
            type_=EncryptedString(),
            existing_nullable=(column == "patronymic"),
        )
    op.alter_column(
        "employee_children",
        "birth_date",
        existing_type=sa.DATE(),
        type_=EncryptedDate(),
        existing_nullable=False,
        postgresql_using="birth_date::text",
    )

    # 4) Backfill the blind index FROM PLAINTEXT — before step 5 encrypts it.
    #    decrypt() passes plaintext through untouched, so this is also correct
    #    if the migration is re-run after a partial failure.
    people = bind.execute(
        sa.text("SELECT id, first_name, last_name FROM persons")
    ).fetchall()
    for person_id, first_name, last_name in people:
        bind.execute(
            sa.text("UPDATE persons SET name_hash = :h WHERE id = :id"),
            {
                "h": name_blind_index(decrypt(first_name), decrypt(last_name)),
                "id": person_id,
            },
        )
    print(f"[blind-index] persons.name_hash: {len(people)} row(s)")

    # 5) Encrypt.
    for table, column in _TARGETS:
        n = _transform_rows(
            table, column, lambda v: v if is_encrypted(v) else encrypt(v)
        )
        print(f"[encrypt] {table}.{column}: {n} row(s)")

    # 6) Now that every row has a hash, enforce it.
    op.alter_column(
        "persons", "name_hash", existing_type=sa.String(length=64), nullable=False
    )
    op.create_index("ix_persons_name_hash", "persons", ["name_hash"])
    op.create_unique_constraint(
        "uq_persons_name_hash_dedupe", "persons", ["name_hash", "name_dedupe_no"]
    )


def downgrade() -> None:
    op.drop_constraint("uq_persons_name_hash_dedupe", "persons", type_="unique")
    op.drop_index("ix_persons_name_hash", table_name="persons")

    # Decrypt while the columns are still TEXT — narrowing first would truncate
    # the ciphertext and destroy the data irrecoverably.
    for table, column in _TARGETS:
        n = _transform_rows(table, column, decrypt)
        print(f"[decrypt] {table}.{column}: {n} row(s)")

    op.alter_column(
        "employee_children",
        "birth_date",
        existing_type=EncryptedDate(),
        type_=sa.DATE(),
        existing_nullable=False,
        postgresql_using="birth_date::date",
    )
    for column in _PERSON_TEXT_COLUMNS:
        op.alter_column(
            "persons",
            column,
            existing_type=EncryptedString(),
            type_=sa.VARCHAR(length=64),
            existing_nullable=(column == "patronymic"),
        )

    op.drop_column("persons", "name_hash")
    op.create_unique_constraint(
        "uq_persons_last_first_dedupe",
        "persons",
        ["last_name", "first_name", "name_dedupe_no"],
    )

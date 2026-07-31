"""encrypt personal data at rest: person birth_date, candidate names

Revision ID: 994c39dcd868
Revises: 55496e4b3bd5
Create Date: 2026-07-30 23:15:29.327763

Two steps per column, and BOTH are required:

  1. widen the column to TEXT (ciphertext is longer than the plaintext, and a
     date can no longer be stored as a date), and
  2. encrypt every existing row.

Autogenerate only produces step 1. Shipping that alone would leave live data as
plaintext in a column the application — and the operator — now believes is
encrypted, which is worse than not encrypting at all.

Re-runnable: `is_encrypted()` skips rows already converted, so an interrupted
run can simply be repeated.

REQUIRES `APP_CONFIG__CRYPTO__KEY` to be set. Without it this migration fails
loudly rather than silently leaving data readable.
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

from backend.utils.crypto.cipher import decrypt, encrypt, is_encrypted
from backend.utils.crypto.types import EncryptedDate, EncryptedString

# revision identifiers, used by Alembic.
revision: str = "994c39dcd868"
down_revision: Union[str, Sequence[str], None] = "55496e4b3bd5"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# (table, column) pairs converted here — mirrors backend/utils/crypto/registry.py
_TARGETS = (
    ("persons", "birth_date"),
    ("recruitment_candidates", "first_name"),
    ("recruitment_candidates", "last_name"),
)


def _transform_rows(table: str, column: str, fn) -> int:
    """Apply `fn` to every non-null value of one column, row by row.

    Deliberately not a single UPDATE: the transform is Fernet, which only exists
    in Python. Row counts here are in the thousands, so the loop is fine.
    """
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
    # 1) Widen to TEXT. The USING cast renders a date as ISO text, which is
    #    exactly the form EncryptedDate stores.
    op.alter_column(
        "persons",
        "birth_date",
        existing_type=sa.DATE(),
        type_=EncryptedDate(),
        existing_nullable=True,
        postgresql_using="birth_date::text",
    )
    for column in ("first_name", "last_name"):
        op.alter_column(
            "recruitment_candidates",
            column,
            existing_type=sa.VARCHAR(length=128),
            type_=EncryptedString(),
            existing_nullable=False,
        )

    # 2) Encrypt what is already there.
    for table, column in _TARGETS:
        n = _transform_rows(
            table, column, lambda v: v if is_encrypted(v) else encrypt(v)
        )
        print(f"[encrypt] {table}.{column}: {n} row(s)")


def downgrade() -> None:
    # Decrypt FIRST, while the column is still TEXT and wide enough to hold the
    # ciphertext. Narrowing before decrypting would truncate it and destroy the
    # data irreversibly.
    for table, column in _TARGETS:
        n = _transform_rows(table, column, decrypt)
        print(f"[decrypt] {table}.{column}: {n} row(s)")

    for column in ("last_name", "first_name"):
        op.alter_column(
            "recruitment_candidates",
            column,
            existing_type=EncryptedString(),
            type_=sa.VARCHAR(length=128),
            existing_nullable=False,
        )
    op.alter_column(
        "persons",
        "birth_date",
        existing_type=EncryptedDate(),
        type_=sa.DATE(),
        existing_nullable=True,
        postgresql_using="birth_date::date",
    )

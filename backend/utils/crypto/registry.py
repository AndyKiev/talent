# backend/utils/crypto/registry.py
"""The allowlist of columns that are encrypted at rest.

Why an allowlist and not "point the tool at any column": encryption is
randomized, so an encrypted column can no longer be used for equality lookup,
`ORDER BY`, `LIKE`, a `UNIQUE` constraint or a foreign key. Encrypting a column
that any of those depend on does not fail loudly — it silently returns wrong
results. So a column is encryptable only after someone has checked it and
changed its type in the model, and this file is the record of that decision.

**The safety test.** A column may be added here only if, in SQL, nothing does:

    ORDER BY it · WHERE/= on it · LIKE/ilike on it · JOIN on it
    · a UNIQUE constraint over it · uses it as a foreign key

Sorting and searching must already happen in Python, or the column must not be
sorted or searched at all. Verify with a grep for `<Model>.<column>` across
`backend/` before adding a row — the check is cheap and the failure is silent.

If a column needs exact-match lookup, encryption alone cannot give it: that
needs a separate deterministic HMAC "blind index" column, which is a different
piece of work and is not what this file provides.

**Renames.** These are strings, and a table or column rename will not update
them. `scripts/crypto/check_encrypted_columns.py` validates every row against
the live `information_schema` — run it after any rename. Renaming a registered
column means: decrypt -> rename -> re-encrypt.
"""

from dataclasses import dataclass


@dataclass(frozen=True)
class EncryptedColumn:
    table: str
    column: str
    # "string" or "date" — which TypeDecorator the model uses, and how the data
    # migration must convert the existing column.
    kind: str
    # Why this data is sensitive, and the evidence it passed the safety test.
    note: str


ENCRYPTED_COLUMNS: tuple[EncryptedColumn, ...] = (
    EncryptedColumn(
        table="persons",
        column="birth_date",
        kind="date",
        note=(
            "Date of birth — personal data under GDPR-equivalent rules. Safe: no "
            "SQL reference anywhere (verified by grep for Person.birth_date); age "
            "is computed in Python and the UI filters it client-side."
        ),
    ),
    EncryptedColumn(
        table="persons",
        column="first_name",
        kind="string",
        note=(
            "Employee identity. NOT plainly safe — it was made safe: the unique "
            "constraint and the two namesake lookups moved onto the persons."
            "name_hash blind index, and display-name composition/sorting moved "
            "out of SQL into Python (see employee_minis.EMPLOYEE_NAME_COLUMNS)."
        ),
    ),
    EncryptedColumn(
        table="persons",
        column="last_name",
        kind="string",
        note="Employee identity. Same blind-index treatment as first_name.",
    ),
    EncryptedColumn(
        table="persons",
        column="patronymic",
        kind="string",
        note=(
            "Employee identity. Safe as-is: zero SQL references anywhere — it is "
            "never part of the composed display name, only shown on the card."
        ),
    ),
    EncryptedColumn(
        table="employee_children",
        column="birth_date",
        kind="date",
        note=(
            "Date of birth of an employee's child — a third party, and a minor. "
            "Safe as-is: zero SQL references; ages are computed in Python."
        ),
    ),
    EncryptedColumn(
        table="recruitment_candidates",
        column="first_name",
        kind="string",
        note=(
            "Candidate identity — people outside the company who never consented "
            "to being in an HR system. Safe: selected as a plain column in "
            "recruitment_application_service and recruitment_interview_service, "
            "never sorted or filtered in SQL."
        ),
    ),
    EncryptedColumn(
        table="recruitment_candidates",
        column="last_name",
        kind="string",
        note="Candidate identity. Same evidence as first_name.",
    ),
)

# Column names that must never reach a sort spec, because sorting ciphertext
# sorts random bytes. Enforced in BaseRepository._parse_sort_spec.
ENCRYPTED_COLUMN_NAMES: frozenset[str] = frozenset(c.column for c in ENCRYPTED_COLUMNS)


def is_encrypted_column(table: str, column: str) -> bool:
    return any(c.table == table and c.column == column for c in ENCRYPTED_COLUMNS)

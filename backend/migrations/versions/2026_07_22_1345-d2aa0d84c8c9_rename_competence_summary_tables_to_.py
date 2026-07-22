"""rename competence summary tables to review_session_employee_dimension

Pure rename — NO data is moved, created or destroyed. The rows written by
734db0819941 plus the one-shot data move are the same rows afterwards.

Hand-written on purpose (the standing exception to the autogenerate rule):
autogenerate cannot recognise a rename. It would emit drop_table + create_table
and silently destroy every row, so the renames are spelled out with
`op.rename_table` / `op.alter_column(new_column_name=...)`.

Why the rename:
  * the essence is `dimension` everywhere else (`review_dimensions`), so
    "competence" was a second word for one concept;
  * strong / to-develop is not a property OF a dimension — it is how ONE
    employee's dimension stands in ONE review, which the old names hid;
  * a dimension means the same thing here as in the general list, so "summary"
    added nothing.

Constraint and index names are renamed too. Postgres keeps the old names when a
table is renamed, and leaving them would make every future autogenerate diff
show drift against the metadata naming convention. The targets below are the
exact names SQLAlchemy generates for the new tables (truncated to 63 chars with
its hash suffix), so the database matches the models exactly.

Revision ID: d2aa0d84c8c9
Revises: c30e360e7d76
Create Date: 2026-07-22 13:45:13.560219

"""

from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = "d2aa0d84c8c9"
down_revision: Union[str, Sequence[str], None] = "c30e360e7d76"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


# (old, new)
TABLES = [
    ("competence_summary_types", "review_session_employee_dimension_types"),
    ("review_summary_competences", "review_session_employee_dimensions"),
    (
        "review_summary_competence_comments",
        "review_session_employee_dimension_comments",
    ),
]

# (table, old_column, new_column) — applied AFTER the table renames, so the
# table names here are already the new ones.
COLUMNS = [
    (
        "review_session_employee_dimensions",
        "competence_summary_type_id",
        "review_session_employee_dimension_type_id",
    ),
    (
        "review_session_employee_dimension_comments",
        "summary_competence_id",
        "review_session_employee_dimension_id",
    ),
]

# (table, old, new) — primary keys, unique and foreign key constraints.
# Postgres treats a unique/primary constraint and its backing index as one
# object, so renaming the constraint renames that index with it.
CONSTRAINTS = [
    (
        "review_session_employee_dimension_types",
        "pk_competence_summary_types",
        "pk_review_session_employee_dimension_types",
    ),
    (
        "review_session_employee_dimension_types",
        "uq_competence_summary_types_key",
        "uq_review_session_employee_dimension_types_key",
    ),
    (
        "review_session_employee_dimensions",
        "pk_review_summary_competences",
        "pk_review_session_employee_dimensions",
    ),
    (
        "review_session_employee_dimensions",
        "uq_review_summary_competence",
        "uq_review_session_employee_dimension",
    ),
    (
        "review_session_employee_dimensions",
        "fk_review_summary_competences_review_session_employee_i_e2ce",
        "fk_review_session_employee_dimensions_review_session_em_242e",
    ),
    (
        "review_session_employee_dimensions",
        "fk_review_summary_competences_competence_summary_type_i_f6ee",
        "fk_review_session_employee_dimensions_review_session_em_794e",
    ),
    (
        "review_session_employee_dimensions",
        "fk_review_summary_competences_dimension_id_review_dimensions",
        "fk_review_session_employee_dimensions_dimension_id_revi_b05f",
    ),
    (
        "review_session_employee_dimension_comments",
        "pk_review_summary_competence_comments",
        "pk_review_session_employee_dimension_comments",
    ),
    (
        "review_session_employee_dimension_comments",
        "fk_review_summary_competence_comments_summary_competenc_a330",
        "fk_review_session_employee_dimension_comments_review_se_96ed",
    ),
]

# (old, new) — plain (non-constraint) indexes
INDEXES = [
    (
        "ix_review_summary_competences_review_session_employee_id",
        "ix_review_session_employee_dimensions_review_session_em_cd9d",
    ),
    (
        "ix_review_summary_competence_comments_summary_competence_id",
        "ix_review_session_employee_dimension_comments_review_se_1966",
    ),
]


def upgrade() -> None:
    """Upgrade schema."""
    for old, new in TABLES:
        op.rename_table(old, new)
    for table, old, new in COLUMNS:
        op.alter_column(table, old, new_column_name=new)
    for table, old, new in CONSTRAINTS:
        op.execute(f'ALTER TABLE {table} RENAME CONSTRAINT "{old}" TO "{new}"')
    for old, new in INDEXES:
        op.execute(f'ALTER INDEX "{old}" RENAME TO "{new}"')


def downgrade() -> None:
    """Downgrade schema — the exact inverse, equally lossless."""
    for old, new in INDEXES:
        op.execute(f'ALTER INDEX "{new}" RENAME TO "{old}"')
    for table, old, new in CONSTRAINTS:
        op.execute(f'ALTER TABLE {table} RENAME CONSTRAINT "{new}" TO "{old}"')
    for table, old, new in COLUMNS:
        op.alter_column(table, new, new_column_name=old)
    for old, new in reversed(TABLES):
        op.rename_table(new, old)

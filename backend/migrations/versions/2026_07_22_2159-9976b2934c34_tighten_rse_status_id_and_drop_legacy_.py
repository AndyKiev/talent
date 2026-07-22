"""tighten rse status_id and drop legacy status feedback columns

Second half of the review-record normalization. 92272f5c7c50 created the tables
and added `review_session_employee_status_id` as NULLABLE;
backend/scripts/migrate_status_and_feedback.py ran in between to backfill it and
to move the two feedback columns into rows. This revision now:

  * tightens `review_session_employee_status_id` to NOT NULL, and
  * drops `status`, `employee_feedback` and `manager_feedback`.

The guard below refuses to run while any row is still unbackfilled, so applying
this without the data move fails loudly instead of destroying the statuses.

WARNING: `downgrade()` recreates all three columns EMPTY (status defaults to
'open'). The text cannot be restored from here — the feedback rows no longer
know which column they came from beyond their type, and re-deriving the varchar
would be a lossy guess. Take a `pg_dump -t review_session_employees` first if
the old values still matter.

Revision ID: 9976b2934c34
Revises: 92272f5c7c50
Create Date: 2026-07-22 21:59:37.379101

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "9976b2934c34"
down_revision: Union[str, Sequence[str], None] = "92272f5c7c50"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    conn = op.get_bind()
    unbackfilled = conn.execute(
        sa.text(
            "select count(*) from review_session_employees "
            "where review_session_employee_status_id is null"
        )
    ).scalar()
    if unbackfilled:
        raise RuntimeError(
            f"{unbackfilled} review_session_employees row(s) still have a NULL "
            "review_session_employee_status_id. Run "
            "`python -m backend.scripts.migrate_status_and_feedback` first — "
            "applying this revision now would drop the `status` column that the "
            "move reads from."
        )

    op.alter_column(
        "review_session_employees",
        "review_session_employee_status_id",
        existing_type=sa.Integer(),
        nullable=False,
    )
    op.drop_column("review_session_employees", "status")
    op.drop_column("review_session_employees", "employee_feedback")
    op.drop_column("review_session_employees", "manager_feedback")


def downgrade() -> None:
    """Downgrade schema — the columns come back EMPTY (see the module docstring)."""
    op.add_column(
        "review_session_employees",
        sa.Column("manager_feedback", sa.TEXT(), autoincrement=False, nullable=True),
    )
    op.add_column(
        "review_session_employees",
        sa.Column("employee_feedback", sa.TEXT(), autoincrement=False, nullable=True),
    )
    op.add_column(
        "review_session_employees",
        sa.Column(
            "status",
            sa.VARCHAR(length=20),
            server_default=sa.text("'open'::character varying"),
            autoincrement=False,
            nullable=False,
        ),
    )
    op.alter_column(
        "review_session_employees",
        "review_session_employee_status_id",
        existing_type=sa.Integer(),
        nullable=True,
    )

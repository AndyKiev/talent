"""add feedback and results fields to review_session_employees

Revision ID: 69ab1b8bc06a
Revises: 997818ed5922
Create Date: 2026-06-10 23:59:37.845001

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "69ab1b8bc06a"
down_revision: Union[str, Sequence[str], None] = "997818ed5922"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column(
        "review_session_employees",
        sa.Column("employee_feedback", sa.Text(), nullable=True),
    )
    op.add_column(
        "review_session_employees",
        sa.Column("manager_feedback", sa.Text(), nullable=True),
    )
    op.add_column(
        "review_session_employees",
        sa.Column("results_achievements", sa.Text(), nullable=True),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column("review_session_employees", "results_achievements")
    op.drop_column("review_session_employees", "manager_feedback")
    op.drop_column("review_session_employees", "employee_feedback")

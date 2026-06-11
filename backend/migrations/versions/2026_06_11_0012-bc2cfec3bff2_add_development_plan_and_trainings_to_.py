"""add development_plan and trainings to review_session_employees

Revision ID: bc2cfec3bff2
Revises: 69ab1b8bc06a
Create Date: 2026-06-11 00:12:47.433737

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "bc2cfec3bff2"
down_revision: Union[str, Sequence[str], None] = "69ab1b8bc06a"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column(
        "review_session_employees",
        sa.Column("development_plan", sa.Text(), nullable=True),
    )
    op.add_column(
        "review_session_employees",
        sa.Column("trainings", sa.Text(), nullable=True),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column("review_session_employees", "trainings")
    op.drop_column("review_session_employees", "development_plan")

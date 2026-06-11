"""add competence_summary to review_session_employees

Revision ID: abce7c32ede2
Revises: bc2cfec3bff2
Create Date: 2026-06-11 00:43:58.266686

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "abce7c32ede2"
down_revision: Union[str, Sequence[str], None] = "bc2cfec3bff2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column(
        "review_session_employees",
        sa.Column("competence_summary", sa.Text(), nullable=True),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column("review_session_employees", "competence_summary")

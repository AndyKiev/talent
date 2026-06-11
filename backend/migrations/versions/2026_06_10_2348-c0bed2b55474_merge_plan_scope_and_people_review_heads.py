"""merge plan_scope and people_review heads

Revision ID: c0bed2b55474
Revises: a1b2c3d4e5f6, 0dead71afd16
Create Date: 2026-06-10 23:48:01.173074

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "c0bed2b55474"
down_revision: Union[str, Sequence[str], None] = (
    "a1b2c3d4e5f6",
    "0dead71afd16",
)
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass

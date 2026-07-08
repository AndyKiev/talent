"""groups by id (contract): drop menus.allowed_groups

Schema-only (contract step). Run AFTER seeds/seed_groups_by_id.py has copied
the CSV group names into menu_user_group_links + visible_to_all_groups, so no
data is lost when the old name-based column is removed.

Revision ID: c8d2e5f7a913
Revises: b7f3c1d9a2e4
Create Date: 2026-07-07 15:20:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "c8d2e5f7a913"
down_revision: Union[str, Sequence[str], None] = "b7f3c1d9a2e4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_column("menus", "allowed_groups")


def downgrade() -> None:
    op.add_column(
        "menus",
        sa.Column("allowed_groups", sa.String(length=256), nullable=True),
    )

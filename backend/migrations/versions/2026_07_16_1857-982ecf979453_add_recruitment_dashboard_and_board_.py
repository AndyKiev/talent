"""add recruitment dashboard and board menu items

Revision ID: 982ecf979453
Revises: a4a8e53b7b46
Create Date: 2026-07-16 18:57:42.146839

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "982ecf979453"
down_revision: Union[str, Sequence[str], None] = "a4a8e53b7b46"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Two more children under 'recruitment': Overview (dashboard with nav
    cards + tasks-per-status chart) first, and the standalone kanban Board
    after tasks. Final child order: overview 0, tasks 1, board 2,
    candidates 3, interviews 4."""
    op.execute(
        """
        INSERT INTO menus (key, label_key, path, icon, parent_id, sort_order,
                           is_active, visible_to_all_groups, visible_to_regular)
        SELECT 'recruitment_dashboard', 'recruitmentOverview',
               '/recruitment_dashboard', 'recruitment', m.id, 0,
               TRUE, FALSE, FALSE
        FROM menus m WHERE m.key = 'recruitment'
        ON CONFLICT (key) DO NOTHING
        """
    )
    op.execute(
        """
        INSERT INTO menus (key, label_key, path, icon, parent_id, sort_order,
                           is_active, visible_to_all_groups, visible_to_regular)
        SELECT 'recruitment_board', 'board', '/recruitment_board', 'recruitment',
               m.id, 2, TRUE, FALSE, FALSE
        FROM menus m WHERE m.key = 'recruitment'
        ON CONFLICT (key) DO NOTHING
        """
    )
    # Re-slot the existing children around the new ones.
    op.execute("UPDATE menus SET sort_order = 1 WHERE key = 'recruitment_tasks'")
    op.execute("UPDATE menus SET sort_order = 3 WHERE key = 'candidates'")
    op.execute("UPDATE menus SET sort_order = 4 WHERE key = 'interviews'")
    # Visible to the 4 HR/admin roles (not the Interviewer group).
    op.execute(
        """
        INSERT INTO menu_user_group_links (menu_id, user_group_id)
        SELECT m.id, g.id
        FROM menus m, user_groups g
        WHERE m.key IN ('recruitment_dashboard', 'recruitment_board')
          AND lower(g.name) IN ('hrs', 'hrm', 'admin', 'dev')
        ON CONFLICT (menu_id, user_group_id) DO NOTHING
        """
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.execute(
        """
        DELETE FROM menu_user_group_links
        WHERE menu_id IN (
            SELECT id FROM menus
            WHERE key IN ('recruitment_dashboard', 'recruitment_board'))
        """
    )
    op.execute(
        "DELETE FROM menus WHERE key IN ('recruitment_dashboard', 'recruitment_board')"
    )
    op.execute("UPDATE menus SET sort_order = 0 WHERE key = 'recruitment_tasks'")
    op.execute("UPDATE menus SET sort_order = 1 WHERE key = 'candidates'")
    op.execute("UPDATE menus SET sort_order = 2 WHERE key = 'interviews'")

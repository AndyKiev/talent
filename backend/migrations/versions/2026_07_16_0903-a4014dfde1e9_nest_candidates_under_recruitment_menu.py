"""nest candidates under recruitment menu

Revision ID: a4014dfde1e9
Revises: b48553770211
Create Date: 2026-07-16 09:03:47.374347

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "a4014dfde1e9"
down_revision: Union[str, Sequence[str], None] = "b48553770211"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Turn 'recruitment' into a parent group with two children — a new
    'recruitment_tasks' item (the tasks list, path /recruitment) and the existing
    'candidates' item, reparented under it. The parent no longer navigates on its
    own (a menu with children opens a dropdown of its children)."""
    # New 'Tasks' child pointing at the existing recruitment tasks page.
    op.execute(
        """
        INSERT INTO menus (key, label_key, path, icon, parent_id, sort_order,
                           is_active, visible_to_all_groups, visible_to_regular)
        SELECT 'recruitment_tasks', 'recruitmentTasks', '/recruitment',
               'recruitment', m.id, 0, TRUE, FALSE, FALSE
        FROM menus m WHERE m.key = 'recruitment'
        ON CONFLICT (key) DO NOTHING
        """
    )
    # Reparent 'candidates' under 'recruitment' and order it after tasks.
    op.execute(
        """
        UPDATE menus SET parent_id = (SELECT id FROM menus WHERE key = 'recruitment'),
                         sort_order = 1
        WHERE key = 'candidates'
        """
    )
    # The new child needs its own group visibility (same 4 roles).
    op.execute(
        """
        INSERT INTO menu_user_group_links (menu_id, user_group_id)
        SELECT m.id, g.id
        FROM menus m, user_groups g
        WHERE m.key = 'recruitment_tasks'
          AND lower(g.name) IN ('hrs', 'hrm', 'admin', 'dev')
        ON CONFLICT (menu_id, user_group_id) DO NOTHING
        """
    )


def downgrade() -> None:
    """Undo: candidates back to top level, drop the recruitment_tasks child."""
    op.execute(
        """
        UPDATE menus SET parent_id = NULL, sort_order = 46 WHERE key = 'candidates'
        """
    )
    op.execute(
        """
        DELETE FROM menu_user_group_links
        WHERE menu_id IN (SELECT id FROM menus WHERE key = 'recruitment_tasks')
        """
    )
    op.execute("DELETE FROM menus WHERE key = 'recruitment_tasks'")

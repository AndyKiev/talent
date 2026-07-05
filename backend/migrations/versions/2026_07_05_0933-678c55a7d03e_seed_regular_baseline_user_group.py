"""seed regular baseline user group

Revision ID: 678c55a7d03e
Revises: 0921b1fd389e
Create Date: 2026-07-05 09:33:30.513766

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "678c55a7d03e"
down_revision: Union[str, Sequence[str], None] = "0921b1fd389e"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Seed the 'regular' baseline authorisation group.

    Employees WITHOUT any authorisation group implicitly inherit this group's
    grants (they are never members) — it appears in the permission matrix as
    the "regular user" column. NOT protected: protected groups are hidden from
    every user who isn't in a protected group themselves, which would hide the
    matrix column.
    """
    op.execute(
        """
        INSERT INTO user_groups (name, description, is_protected, user_group_type_id)
        SELECT 'regular',
               'Baseline permissions for users without any authorisation group '
               '(the permission-matrix "regular user" column). Users are never '
               'members — the grants apply implicitly.',
               FALSE,
               t.id
        FROM user_group_types t
        WHERE t.name = 'authorisation'
          AND NOT EXISTS (
            SELECT 1 FROM user_groups g
            JOIN user_group_types gt ON gt.id = g.user_group_type_id
            WHERE g.name = 'regular' AND gt.name = 'authorisation'
          )
        """
    )


def downgrade() -> None:
    """Remove the seeded 'regular' group (its grant links cascade)."""
    op.execute(
        """
        DELETE FROM user_groups g
        USING user_group_types gt
        WHERE gt.id = g.user_group_type_id
          AND g.name = 'regular'
          AND gt.name = 'authorisation'
        """
    )

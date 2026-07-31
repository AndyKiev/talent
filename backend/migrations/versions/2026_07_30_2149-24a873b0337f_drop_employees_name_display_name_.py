"""drop employees.name (display name composed from person)

Revision ID: 24a873b0337f
Revises: c7e1a94f5b30
Create Date: 2026-07-30 21:49:50.526021

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "24a873b0337f"
down_revision: Union[str, Sequence[str], None] = "c7e1a94f5b30"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Drop the denormalized display name.

    Name parts live only on persons now; Employee.name is a property composed
    at read time in the viewer's preferred order (surname_first_in_names).
    """
    op.drop_column("employees", "name")


def downgrade() -> None:
    """Re-add the column and rebuild the canonical 'Last First' value.

    Three steps, not one: the column is NOT NULL, so it has to be added
    nullable, backfilled from persons, and only then constrained.
    """
    op.add_column(
        "employees",
        sa.Column("name", sa.VARCHAR(length=128), autoincrement=False, nullable=True),
    )
    op.execute(
        "UPDATE employees e SET name = p.last_name || ' ' || p.first_name "
        "FROM persons p WHERE p.id = e.person_id"
    )
    op.alter_column("employees", "name", nullable=False)

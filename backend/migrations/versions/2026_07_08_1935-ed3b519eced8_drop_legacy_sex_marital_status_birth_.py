"""drop legacy sex, marital_status, birth_date from employee_personal_data

Revision ID: ed3b519eced8
Revises: da427519d4aa
Create Date: 2026-07-08 19:35:57.520880

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "ed3b519eced8"
down_revision: Union[str, Sequence[str], None] = "da427519d4aa"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Person-level facts (sex, marital status, birth date) live on persons
    # (via employees.person_id); data was verified fully duplicated there.
    op.drop_column("employee_personal_data", "sex")
    op.drop_column("employee_personal_data", "marital_status")
    op.drop_column("employee_personal_data", "birth_date")


def downgrade() -> None:
    """Downgrade schema."""
    op.add_column(
        "employee_personal_data",
        sa.Column("birth_date", sa.DATE(), autoincrement=False, nullable=True),
    )
    op.add_column(
        "employee_personal_data",
        sa.Column(
            "marital_status",
            sa.VARCHAR(length=16),
            autoincrement=False,
            nullable=True,
        ),
    )
    op.add_column(
        "employee_personal_data",
        sa.Column("sex", sa.VARCHAR(length=8), autoincrement=False, nullable=True),
    )

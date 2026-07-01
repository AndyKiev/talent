"""rename training_statuses to employee_training_statuses

Revision ID: f04b4e050129
Revises: d63158dff4da
Create Date: 2026-07-01 15:26:08.834110

"""

from typing import Sequence, Union

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "f04b4e050129"
down_revision: Union[str, Sequence[str], None] = "d63158dff4da"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.drop_constraint(
        "fk_employee_trainings_training_status_id_training_statuses",
        "employee_trainings",
        type_="foreignkey",
    )
    op.rename_table("training_statuses", "employee_training_statuses")
    op.execute(
        "ALTER INDEX pk_training_statuses RENAME TO pk_employee_training_statuses"
    )
    op.execute(
        "ALTER INDEX uq_training_statuses_key RENAME TO uq_employee_training_statuses_key"
    )
    op.execute(
        "ALTER SEQUENCE training_statuses_id_seq RENAME TO employee_training_statuses_id_seq"
    )
    op.create_foreign_key(
        "fk_employee_trainings_training_status_id_emp_training_statuses",
        "employee_trainings",
        "employee_training_statuses",
        ["training_status_id"],
        ["id"],
        ondelete="RESTRICT",
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_constraint(
        "fk_employee_trainings_training_status_id_emp_training_statuses",
        "employee_trainings",
        type_="foreignkey",
    )
    op.execute(
        "ALTER SEQUENCE employee_training_statuses_id_seq RENAME TO training_statuses_id_seq"
    )
    op.execute(
        "ALTER INDEX uq_employee_training_statuses_key RENAME TO uq_training_statuses_key"
    )
    op.execute(
        "ALTER INDEX pk_employee_training_statuses RENAME TO pk_training_statuses"
    )
    op.rename_table("employee_training_statuses", "training_statuses")
    op.create_foreign_key(
        "fk_employee_trainings_training_status_id_training_statuses",
        "employee_trainings",
        "training_statuses",
        ["training_status_id"],
        ["id"],
        ondelete="RESTRICT",
    )

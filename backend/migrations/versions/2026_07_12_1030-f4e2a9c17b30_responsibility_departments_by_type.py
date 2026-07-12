"""responsibility departments keyed on department TYPE + is_responsibility DC flag

Retypes the two RESPONSIBILITY-only link tables from a department INSTANCE
(department_id) to a department TYPE (department_type_id):
  - employee_responsibility_departments
  - employee_event_change_departments
and adds the department_categories.is_responsibility flag (categories offered as
a source of responsibility department types in the RESPONSIBILITY_DEPTS_CHANGE
event). Existing rows are converted to the department's type and de-duplicated.

Revision ID: f4e2a9c17b30
Revises: 4a7cb024ffee
Create Date: 2026-07-12 10:30:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "f4e2a9c17b30"
down_revision: Union[str, Sequence[str], None] = "4a7cb024ffee"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _retype_to_department_type(
    table: str,
    owner_col: str,
    old_fk_name: str,
    uq_name: str,
) -> None:
    """Convert `table`.department_id (instance) -> department_type_id (type)."""
    # 1. New nullable column.
    op.add_column(
        table,
        sa.Column("department_type_id", sa.Integer(), nullable=True),
    )
    # 2. Fill it from each department's type.
    op.execute(
        f"""
        UPDATE {table} t
        SET department_type_id = d.department_type_id
        FROM departments d
        WHERE d.id = t.department_id
        """
    )
    # 3. Drop rows that could not be mapped (orphaned department_id).
    op.execute(f"DELETE FROM {table} WHERE department_type_id IS NULL")
    # 4. De-duplicate: keep the lowest id per (owner, type).
    op.execute(
        f"""
        DELETE FROM {table} a
        USING {table} b
        WHERE a.{owner_col} = b.{owner_col}
          AND a.department_type_id = b.department_type_id
          AND a.id > b.id
        """
    )
    # 5. Swap constraints and the old column.
    op.drop_constraint(uq_name, table, type_="unique")
    op.drop_constraint(old_fk_name, table, type_="foreignkey")
    op.drop_column(table, "department_id")
    op.alter_column(table, "department_type_id", nullable=False)
    op.create_foreign_key(
        op.f(f"fk_{table}_department_type_id_department_types"),
        table,
        "department_types",
        ["department_type_id"],
        ["id"],
        ondelete="RESTRICT",
    )
    op.create_unique_constraint(uq_name, table, [owner_col, "department_type_id"])


def _revert_to_department_instance(
    table: str,
    owner_col: str,
    old_fk_name: str,
    uq_name: str,
) -> None:
    """Best-effort downgrade: type -> instance cannot be resolved uniquely, so
    the department_id is left NULL for the caller to re-populate."""
    op.drop_constraint(uq_name, table, type_="unique")
    op.drop_constraint(
        op.f(f"fk_{table}_department_type_id_department_types"),
        table,
        type_="foreignkey",
    )
    op.add_column(
        table,
        sa.Column("department_id", sa.Integer(), nullable=True),
    )
    op.drop_column(table, "department_type_id")
    op.create_foreign_key(
        old_fk_name,
        table,
        "departments",
        ["department_id"],
        ["id"],
        ondelete="RESTRICT",
    )
    op.create_unique_constraint(uq_name, table, [owner_col, "department_id"])


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column(
        "department_categories",
        sa.Column(
            "is_responsibility",
            sa.Boolean(),
            nullable=False,
            server_default=sa.false(),
        ),
    )

    _retype_to_department_type(
        table="employee_responsibility_departments",
        owner_col="employee_id",
        old_fk_name="fk_employee_responsibility_departments_department_id_de_5fd4",
        uq_name="uq_employee_responsibility_department",
    )
    _retype_to_department_type(
        table="employee_event_change_departments",
        owner_col="event_change_id",
        old_fk_name="fk_employee_event_change_departments_department_id_departments",
        uq_name="uq_event_change_department",
    )


def downgrade() -> None:
    """Downgrade schema."""
    _revert_to_department_instance(
        table="employee_event_change_departments",
        owner_col="event_change_id",
        old_fk_name="fk_employee_event_change_departments_department_id_departments",
        uq_name="uq_event_change_department",
    )
    _revert_to_department_instance(
        table="employee_responsibility_departments",
        owner_col="employee_id",
        old_fk_name="fk_employee_responsibility_departments_department_id_de_5fd4",
        uq_name="uq_employee_responsibility_department",
    )
    op.drop_column("department_categories", "is_responsibility")

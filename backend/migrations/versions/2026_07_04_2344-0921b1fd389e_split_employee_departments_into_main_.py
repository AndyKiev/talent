"""split employee departments into main and responsibility tables, drop event change dept type lookup

Revision ID: 0921b1fd389e
Revises: 63eda2ec93fd
Create Date: 2026-07-04 23:44:55.448495

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "0921b1fd389e"
down_revision: Union[str, Sequence[str], None] = "63eda2ec93fd"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # ── 1) New responsibility-departments table ────────────────────────────────
    op.create_table(
        "employee_responsibility_departments",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("employee_id", sa.Integer(), nullable=False),
        sa.Column("department_id", sa.Integer(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["department_id"],
            ["departments.id"],
            name=op.f(
                "fk_employee_responsibility_departments_department_id_departments"
            ),
            ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            ["employee_id"],
            ["employees.id"],
            name=op.f(
                "fk_employee_responsibility_departments_employee_id_employees"
            ),
            ondelete="RESTRICT",
        ),
        sa.PrimaryKeyConstraint(
            "id", name=op.f("pk_employee_responsibility_departments")
        ),
        sa.UniqueConstraint(
            "employee_id",
            "department_id",
            name="uq_employee_responsibility_department",
        )
    )
    op.create_index(
        op.f("ix_employee_responsibility_departments_employee_id"),
        "employee_responsibility_departments",
        ["employee_id"],
        unique=False,
    )

    # ── 2) DATA: split employee_departments ───────────────────────────────────
    # Responsibility rows (is_main=false) move to the new table.
    op.execute(
        """
        INSERT INTO employee_responsibility_departments (employee_id, department_id, created_at)
        SELECT employee_id, department_id, created_at
        FROM employee_departments
        WHERE is_main = FALSE
        ON CONFLICT (employee_id, department_id) DO NOTHING
        """
    )
    # If an employee somehow has several mains, the newest (max id) stays main;
    # older mains are preserved as responsibility departments.
    op.execute(
        """
        INSERT INTO employee_responsibility_departments (employee_id, department_id, created_at)
        SELECT ed.employee_id, ed.department_id, ed.created_at
        FROM employee_departments ed
        WHERE ed.is_main = TRUE
          AND ed.id NOT IN (
            SELECT MAX(id) FROM employee_departments
            WHERE is_main = TRUE GROUP BY employee_id
          )
        ON CONFLICT (employee_id, department_id) DO NOTHING
        """
    )
    # Keep exactly one (the newest) main row per employee in employee_departments.
    op.execute(
        """
        DELETE FROM employee_departments
        WHERE is_main = FALSE
           OR id NOT IN (
            SELECT MAX(id) FROM employee_departments
            WHERE is_main = TRUE GROUP BY employee_id
          )
        """
    )

    # ── 3) employee_departments becomes main-only ─────────────────────────────
    op.drop_constraint(
        op.f("uq_employee_department"), "employee_departments", type_="unique"
    )
    op.create_unique_constraint(
        "uq_employee_department", "employee_departments", ["employee_id"]
    )
    op.drop_column("employee_departments", "is_main")

    # ── 4) Drop the event change dept-type discriminator ──────────────────────
    # (FK + column first, only then the lookup table it references.)
    op.drop_constraint(
        op.f("uq_event_change_department"),
        "employee_event_change_departments",
        type_="unique",
    )
    op.create_unique_constraint(
        "uq_event_change_department",
        "employee_event_change_departments",
        ["event_change_id", "department_id"],
    )
    op.drop_constraint(
        op.f("fk_employee_event_change_departments_change_dept_type_i_1961"),
        "employee_event_change_departments",
        type_="foreignkey",
    )
    op.drop_column("employee_event_change_departments", "change_dept_type_id")
    op.drop_table("employee_event_change_dept_types")

    # ── 5) ACL: remove the dropped essence (links cascade at the DB) ──────────
    op.execute(
        "DELETE FROM essences WHERE name = 'employee_event_change_dept_type'"
    )


def downgrade() -> None:
    """Downgrade schema (best-effort data restore)."""
    # Recreate the dept-type lookup + its seed rows.
    op.create_table(
        "employee_event_change_dept_types",
        sa.Column("id", sa.INTEGER(), autoincrement=True, nullable=False),
        sa.Column(
            "code", sa.VARCHAR(length=64), autoincrement=False, nullable=False
        ),
        sa.Column(
            "name", sa.VARCHAR(length=128), autoincrement=False, nullable=False
        ),
        sa.PrimaryKeyConstraint(
            "id", name=op.f("pk_employee_event_change_dept_types")
        ),
        sa.UniqueConstraint(
            "code",
            name=op.f("uq_employee_event_change_dept_types_code"),
        )
    )
    op.execute(
        """
        INSERT INTO employee_event_change_dept_types (code, name) VALUES
        ('MAIN_DEPT', 'Main department'),
        ('RESPONSIBILITY_DEPT', 'Responsibility department')
        """
    )
    op.execute(
        "INSERT INTO essences (name) VALUES ('employee_event_change_dept_type') "
        "ON CONFLICT DO NOTHING"
    )

    # change_dept_type_id back: add nullable, backfill to RESPONSIBILITY_DEPT
    # (the only type that ever carried child rows), then tighten.
    op.add_column(
        "employee_event_change_departments",
        sa.Column("change_dept_type_id", sa.INTEGER(), nullable=True),
    )
    op.execute(
        """
        UPDATE employee_event_change_departments
        SET change_dept_type_id = (
            SELECT id FROM employee_event_change_dept_types
            WHERE code = 'RESPONSIBILITY_DEPT'
        )
        """
    )
    op.alter_column(
        "employee_event_change_departments", "change_dept_type_id", nullable=False
    )
    op.create_foreign_key(
        op.f("fk_employee_event_change_departments_change_dept_type_i_1961"),
        "employee_event_change_departments",
        "employee_event_change_dept_types",
        ["change_dept_type_id"],
        ["id"],
        ondelete="RESTRICT",
    )
    op.drop_constraint(
        "uq_event_change_department",
        "employee_event_change_departments",
        type_="unique",
    )
    op.create_unique_constraint(
        op.f("uq_event_change_department"),
        "employee_event_change_departments",
        ["event_change_id", "department_id", "change_dept_type_id"],
    )

    # is_main back on employee_departments; every surviving row is a main.
    op.add_column(
        "employee_departments",
        sa.Column(
            "is_main",
            sa.BOOLEAN(),
            server_default=sa.text("false"),
            nullable=False,
        ),
    )
    op.execute("UPDATE employee_departments SET is_main = TRUE")
    op.alter_column("employee_departments", "is_main", server_default=None)
    op.drop_constraint(
        "uq_employee_department", "employee_departments", type_="unique"
    )
    op.create_unique_constraint(
        op.f("uq_employee_department"),
        "employee_departments",
        ["employee_id", "department_id", "is_main"],
    )

    # Responsibility rows fold back in as is_main=false links.
    op.execute(
        """
        INSERT INTO employee_departments (employee_id, department_id, is_main, created_at)
        SELECT employee_id, department_id, FALSE, created_at
        FROM employee_responsibility_departments
        ON CONFLICT DO NOTHING
        """
    )

    op.drop_index(
        op.f("ix_employee_responsibility_departments_employee_id"),
        table_name="employee_responsibility_departments",
    )
    op.drop_table("employee_responsibility_departments")

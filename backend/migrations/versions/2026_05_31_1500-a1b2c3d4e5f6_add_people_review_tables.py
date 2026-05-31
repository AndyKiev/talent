"""add people review tables

Revision ID: a1b2c3d4e5f6
Revises: d7439cc54970
Create Date: 2026-05-31 15:00:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "a1b2c3d4e5f6"
down_revision: Union[str, Sequence[str], None] = "d7439cc54970"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # review_dimensions — directory of evaluation dimensions (TEMPO)
    op.create_table(
        "review_dimensions",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("name", sa.String(length=128), nullable=False),
        sa.Column("key", sa.String(length=64), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("name", name="uq_review_dimensions_name"),
        sa.UniqueConstraint("key", name="uq_review_dimensions_key"),
    )

    # review_dimension_criterias — explanation items per dimension
    op.create_table(
        "review_dimension_criterias",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("dimension_id", sa.Integer(), nullable=False),
        sa.Column("text", sa.Text(), nullable=False),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["dimension_id"],
            ["review_dimensions.id"],
            name="fk_review_dim_criteria_dimension",
        ),
        sa.PrimaryKeyConstraint("id"),
    )

    # review_sessions — one record per review campaign
    op.create_table(
        "review_sessions",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("name", sa.String(length=256), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column(
            "status",
            sa.String(length=20),
            nullable=False,
            server_default=sa.text("'pending'"),
        ),
        sa.Column("period_start", sa.Date(), nullable=True),
        sa.Column("period_end", sa.Date(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
    )

    # review_session_employees — one record per employee per session
    op.create_table(
        "review_session_employees",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("session_id", sa.Integer(), nullable=False),
        sa.Column("employee_id", sa.Integer(), nullable=False),
        sa.Column(
            "status",
            sa.String(length=20),
            nullable=False,
            server_default=sa.text("'open'"),
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["session_id"],
            ["review_sessions.id"],
            name="fk_rse_session",
        ),
        sa.ForeignKeyConstraint(
            ["employee_id"],
            ["employees.id"],
            name="fk_rse_employee",
        ),
        sa.PrimaryKeyConstraint("id"),
    )

    # review_session_employee_evaluations — score per dimension per employee
    op.create_table(
        "review_session_employee_evaluations",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("review_session_employee_id", sa.Integer(), nullable=False),
        sa.Column("dimension_id", sa.Integer(), nullable=False),
        sa.Column("score", sa.Integer(), nullable=True),
        sa.Column("facts", sa.Text(), nullable=True),
        sa.Column("improvement", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["review_session_employee_id"],
            ["review_session_employees.id"],
            name="fk_rsee_rse",
        ),
        sa.ForeignKeyConstraint(
            ["dimension_id"],
            ["review_dimensions.id"],
            name="fk_rsee_dimension",
        ),
        sa.CheckConstraint(
            "score IS NULL OR (score >= 0 AND score <= 5)",
            name="ck_score_range",
        ),
        sa.PrimaryKeyConstraint("id"),
    )


def downgrade() -> None:
    op.drop_table("review_session_employee_evaluations")
    op.drop_table("review_session_employees")
    op.drop_table("review_sessions")
    op.drop_table("review_dimension_criterias")
    op.drop_table("review_dimensions")

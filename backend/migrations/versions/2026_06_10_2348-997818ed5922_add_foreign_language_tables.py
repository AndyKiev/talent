"""add foreign language tables

Revision ID: 997818ed5922
Revises: c0bed2b55474
Create Date: 2026-06-10 23:48:30.792228

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "997818ed5922"
down_revision: Union[str, Sequence[str], None] = "c0bed2b55474"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        "language_levels",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("code", sa.String(length=8), nullable=False),
        sa.Column("label", sa.String(length=64), nullable=False),
        sa.Column("hint", sa.Text(), nullable=False),
        sa.Column("sort_order", sa.Integer(), nullable=False),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_language_levels")),
        sa.UniqueConstraint("code", name=op.f("uq_language_levels_code"))
    )
    op.create_table(
        "employee_language_profiles",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("employee_id", sa.Integer(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["employee_id"],
            ["employees.id"],
            name=op.f("fk_employee_language_profiles_employee_id_employees"),
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_employee_language_profiles")),
        sa.UniqueConstraint(
            "employee_id",
            name=op.f("uq_employee_language_profiles_employee_id"),
        )
    )
    op.create_table(
        "employee_languages",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("profile_id", sa.Integer(), nullable=False),
        sa.Column("language", sa.String(length=32), nullable=False),
        sa.Column("level_id", sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(
            ["level_id"],
            ["language_levels.id"],
            name=op.f("fk_employee_languages_level_id_language_levels"),
        ),
        sa.ForeignKeyConstraint(
            ["profile_id"],
            ["employee_language_profiles.id"],
            name=op.f("fk_employee_languages_profile_id_employee_language_profiles"),
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_employee_languages"))
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_table("employee_languages")
    op.drop_table("employee_language_profiles")
    op.drop_table("language_levels")

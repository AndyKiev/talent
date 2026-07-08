"""groups by id (expand): menu_user_group_links table + role flag columns

Schema-only (expand step). Adds the id/flag-based structures but KEEPS
menus.allowed_groups so the seed can read it live:
  - menu_user_group_links(menu_id, user_group_id) association table
  - menus.visible_to_all_groups
  - user_group_types.is_authorisation
  - user_groups.is_bypass / is_regular_baseline

Data population is done by seeds/seed_groups_by_id.py (run after this).
The old menus.allowed_groups column is dropped by the follow-up contract
migration (next revision), AFTER the seed has run.

Revision ID: b7f3c1d9a2e4
Revises: 906608b01a30
Create Date: 2026-07-07 15:00:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "b7f3c1d9a2e4"
down_revision: Union[str, Sequence[str], None] = "906608b01a30"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "menu_user_group_links",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("menu_id", sa.Integer(), nullable=False),
        sa.Column("user_group_id", sa.Integer(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["menu_id"],
            ["menus.id"],
            name=op.f("fk_menu_user_group_links_menu_id_menus"),
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["user_group_id"],
            ["user_groups.id"],
            name=op.f("fk_menu_user_group_links_user_group_id_user_groups"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_menu_user_group_links")),
        sa.UniqueConstraint(
            "menu_id", "user_group_id", name="idx_uq_menu_user_group"
        ),
    )

    # NOT NULL bool columns on tables with existing rows: add with a transient
    # server_default so existing rows get FALSE, then drop the default so the DB
    # matches the model (python-side default only). Pure DDL — no data seeding.
    op.add_column(
        "menus",
        sa.Column(
            "visible_to_all_groups",
            sa.Boolean(),
            nullable=False,
            server_default=sa.false(),
        ),
    )
    op.add_column(
        "user_groups",
        sa.Column(
            "is_bypass", sa.Boolean(), nullable=False, server_default=sa.false()
        ),
    )
    op.add_column(
        "user_groups",
        sa.Column(
            "is_regular_baseline",
            sa.Boolean(),
            nullable=False,
            server_default=sa.false(),
        ),
    )
    op.add_column(
        "user_group_types",
        sa.Column(
            "is_authorisation",
            sa.Boolean(),
            nullable=False,
            server_default=sa.false(),
        ),
    )
    op.alter_column("menus", "visible_to_all_groups", server_default=None)
    op.alter_column("user_groups", "is_bypass", server_default=None)
    op.alter_column("user_groups", "is_regular_baseline", server_default=None)
    op.alter_column("user_group_types", "is_authorisation", server_default=None)


def downgrade() -> None:
    op.drop_column("user_group_types", "is_authorisation")
    op.drop_column("user_groups", "is_regular_baseline")
    op.drop_column("user_groups", "is_bypass")
    op.drop_column("menus", "visible_to_all_groups")
    op.drop_table("menu_user_group_links")

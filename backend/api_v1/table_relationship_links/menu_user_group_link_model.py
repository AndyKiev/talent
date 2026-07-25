from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.api_v1.base.base_model import Base
from backend.api_v1.base.models.utils.mixins import IntIdPkMixin, TimestampMixin

if TYPE_CHECKING:
    from backend.api_v1.menu.menu_model import Menu


class MenuUserGroupLink(IntIdPkMixin, TimestampMixin, Base):
    """
    Which user-groups may see a given menu item — by group **id**, never name.

    Replaces the old ``menus.allowed_groups`` CSV-of-names column so that
    renaming a group can never silently change menu visibility. See the
    three-state visibility rules on ``Menu`` (visible_to_regular /
    visible_to_all_groups / specific link rows).
    """

    __table_args__ = (
        UniqueConstraint(
            "menu_id",
            "user_group_id",
            name="idx_uq_menu_user_group",
        ),
    )
    menu_id: Mapped[int] = mapped_column(
        ForeignKey("menus.id", ondelete="CASCADE"), nullable=False
    )
    user_group_id: Mapped[int] = mapped_column(
        ForeignKey("user_groups.id", ondelete="CASCADE"), nullable=False
    )

    menu: Mapped["Menu"] = relationship(
        back_populates="user_group_links", lazy="selectin"
    )

from __future__ import annotations

from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import ForeignKey, String, Boolean, Integer
from typing import TYPE_CHECKING, Optional

from backend.api_v1.base.base_model import Base
from backend.api_v1.base.models import IntIdPkMixin

if TYPE_CHECKING:
    from backend.api_v1.table_relationship_links.menu_user_group_link_model import (
        MenuUserGroupLink,
    )


class Menu(IntIdPkMixin, Base):
    """
    One main-navigation menu item, rendered dynamically by the frontend.

    Visibility is three independent axes (see MenuService.get_my_menus):
      - ``visible_to_regular`` — visible to users WITHOUT any group
        ('only me' regular users).
      - ``visible_to_all_groups`` — visible to EVERY user who has at least one
        group (the specific ``user_group_links`` are ignored in this mode).
      - ``user_group_links`` — when NOT visible_to_all_groups, only users in one
        of these linked groups (by **id**, never name) see the item.
    ``parent_id`` supports one level of sub-menus (rendered as a dropdown).
    ``key`` is the stable identifier; ``label_key`` resolves via getString.
    """

    key: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    label_key: Mapped[str] = mapped_column(String(128), nullable=False)
    path: Mapped[str] = mapped_column(String(128), nullable=False)
    icon: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    parent_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("menus.id", ondelete="RESTRICT"),
        nullable=True,
    )
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    # Visible to every user with >=1 group. When True, user_group_links are
    # ignored. When False, only the linked groups (below) see the item.
    visible_to_all_groups: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False
    )
    visible_to_regular: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False
    )

    # Which groups may see this item (by id). Ignored when visible_to_all_groups.
    user_group_links: Mapped[list["MenuUserGroupLink"]] = relationship(
        back_populates="menu",
        lazy="selectin",
        cascade="all, delete-orphan",
    )

    @property
    def allowed_group_ids(self) -> list[int]:
        """User-group ids allowed to see this item (empty when all-groups mode)."""
        return [link.user_group_id for link in self.user_group_links]

    def __repr__(self) -> str:
        return f"<Menu(id={self.id}, key='{self.key}', path='{self.path}')>"

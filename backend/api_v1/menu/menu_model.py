from __future__ import annotations

from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import ForeignKey, String, Boolean, Integer
from typing import Optional

from backend.api_v1.base.base_model import Base
from backend.api_v1.base.models import IntIdPkMixin


class Menu(IntIdPkMixin, Base):
    """
    One main-navigation menu item, rendered dynamically by the frontend.

    Visibility:
      - ``allowed_groups``  — comma-separated user-group names; NULL means the
        item is visible to every user who has at least one group.
      - ``visible_to_regular`` — also visible to users WITHOUT any group
        ('only me' regular users).
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
    # Comma-separated group names (case-insensitive match); NULL = everyone
    # with at least one group.
    allowed_groups: Mapped[Optional[str]] = mapped_column(String(256), nullable=True)
    visible_to_regular: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False
    )

    def __repr__(self) -> str:
        return f"<Menu(id={self.id}, key='{self.key}', path='{self.path}')>"

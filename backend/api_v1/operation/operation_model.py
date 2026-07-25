# backend/api_v1/models/operation_model.py
from typing import TYPE_CHECKING

from sqlalchemy import String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.api_v1.base.base_model import Base
from backend.api_v1.base.models.utils.mixins import IntIdPkMixin

# backend/api_v1/operation/operation_model.py

if TYPE_CHECKING:
    from backend.api_v1.operation_essence_link.operation_essence_link_model import (
        OperationEssenceLink,
    )
    from backend.api_v1.table_relationship_links.operation_user_group_link_model import (
        OperationUserGroupLink,
    )


class Operation(IntIdPkMixin, Base):
    name: Mapped[str] = mapped_column(String(128), unique=True, nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Old flat system — keep during transition
    _user_groups: Mapped[list["OperationUserGroupLink"]] = relationship(
        "OperationUserGroupLink",
        back_populates="operation",
        lazy="selectin",
    )

    # Tier 1 — new relationship that OperationEssenceLink.operation points back to
    essence_links: Mapped[list["OperationEssenceLink"]] = relationship(
        back_populates="operation",
        lazy="selectin",
        cascade="all, delete-orphan",
    )

    @property
    def user_groups(self) -> list[str]:
        return [
            link.user_group.name
            for link in self._user_groups
            if link.user_group and link.user_group.name
        ]

    @property
    def essences(self) -> list[str]:
        """Names of essences that have this operation enabled."""
        return [link.essence.name for link in self.essence_links if link.essence]

    def __repr__(self):
        return f"<Operation(id={self.id}, name='{self.name}')>"

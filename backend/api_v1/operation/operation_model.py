# backend/api_v1/models/operation_model.py
from typing import TYPE_CHECKING
from sqlalchemy import String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.database.mixins import IntIdPkMixin
from backend.api_v1.base.base_model import Base

if TYPE_CHECKING:
    from backend.api_v1.base.models.links.operation_user_group_link_model import (
        OperationUserGroupLink,
    )


class Operation(IntIdPkMixin, Base):
    # __tablename__ = "operations"

    name: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    _user_groups: Mapped[list["OperationUserGroupLink"]] = relationship(
        "OperationUserGroupLink",
        back_populates="operation",
        lazy="selectin",
    )

    @property
    def user_groups(self) -> list[str]:
        return [
            link.user_group.name
            for link in self._user_groups
            if link.user_group and link.user_group.name
        ]

    def __repr__(self):
        return f"<Operation(id={self.id}, name='{self.name}')>"

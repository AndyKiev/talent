from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import String, Text
from backend.api_v1.base.base_model import Base
from backend.api_v1.base.models import IntIdPkMixin, TimestampMixin
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from backend.api_v1.user_group.user_group_model import UserGroup


class UserGroupType(IntIdPkMixin, TimestampMixin, Base):

    name: Mapped[str] = mapped_column(String(128), nullable=False, unique=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    user_groups: Mapped[list["UserGroup"]] = relationship(
        back_populates="user_group_type",
        lazy="selectin",
    )

    @property
    def groups(self) -> list[str]:
        return [ug.name for ug in self.user_groups if ug.name]

    def __repr__(self) -> str:
        return f"<UserGroupType(id={self.id}, name='{self.name}')>"

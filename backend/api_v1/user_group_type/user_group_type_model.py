from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import String, Text, Boolean
from backend.api_v1.base.base_model import Base
from backend.api_v1.base.models import IntIdPkMixin, TimestampMixin
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from backend.api_v1.user_group.user_group_model import UserGroup


class UserGroupType(IntIdPkMixin, TimestampMixin, Base):

    name: Mapped[str] = mapped_column(String(128), nullable=False, unique=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    # Marks the type whose groups carry access-control grants (was matched by
    # name == "authorisation"). Flag, not name/id, so renaming is safe.
    is_authorisation: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False
    )

    user_groups: Mapped[list["UserGroup"]] = relationship(
        back_populates="user_group_type",
        lazy="selectin",
    )

    @property
    def groups(self) -> list[str]:
        return [ug.name for ug in self.user_groups if ug.name]

    def __repr__(self) -> str:
        return f"<UserGroupType(id={self.id}, name='{self.name}')>"

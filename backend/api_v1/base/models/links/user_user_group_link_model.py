from typing import TYPE_CHECKING
from sqlalchemy.orm import mapped_column, Mapped, relationship
from sqlalchemy import UniqueConstraint, ForeignKey
from backend.api_v1.base.base_model import Base
from backend.database.mixins import IntIdPkMixin, TimestampMixin

if TYPE_CHECKING:
    from backend.api_v1.user_group.user_group_model import UserGroup
    from backend.api_v1.user.user_model import User


class UserUserGroupLink(IntIdPkMixin, TimestampMixin, Base):
    # __tablename__ = "user_user_group_link"
    __table_args__ = (
        UniqueConstraint(
            "user_id",
            "user_group_id",
            name="idx_uq_user_user_group",
        ),
    )
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    user_group_id: Mapped[int] = mapped_column(ForeignKey("user_groups.id"))

    user: Mapped["User"] = relationship(back_populates="user_groups", lazy="selectin")
    user_group: Mapped["UserGroup"] = relationship(
        back_populates="users", lazy="selectin"
    )

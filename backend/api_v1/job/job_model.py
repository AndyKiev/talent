from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import String
from backend.api_v1.base.base_model import Base
from backend.database.mixins import IntIdPkMixin, TimestampMixin
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from backend.api_v1.user.user_model import User
    from backend.api_v1.base.models.links.job_user_group_link_model import (
        JobUserGroupLink,
    )


class Job(IntIdPkMixin, TimestampMixin, Base):

    name: Mapped[str] = mapped_column(String(100), nullable=False, unique=True)
    description: Mapped[str] = mapped_column(String(200), nullable=True)

    # Relationships
    users: Mapped[list["User"]] = relationship(back_populates="job")

    user_groups: Mapped[list["JobUserGroupLink"]] = relationship(
        back_populates="job",
        lazy="selectin",
    )

    @property
    def groups(self) -> list[str]:
        return [
            link.user_group.name
            for link in self.user_groups
            if link.user_group and link.user_group.name
        ]

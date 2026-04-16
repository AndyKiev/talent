from typing import TYPE_CHECKING
from sqlalchemy.orm import mapped_column, Mapped, relationship
from sqlalchemy import String, Boolean, ForeignKey
from backend.api_v1.base.base_model import Base
from backend.database.mixins import IntIdPkMixin, TimestampMixin


if TYPE_CHECKING:
    from backend.api_v1.base.models.links.user_user_group_link_model import (
        UserUserGroupLink,
    )
    from backend.api_v1.job.job_model import Job
    from backend.api_v1.message.message_model import Lang


class User(IntIdPkMixin, TimestampMixin, Base):
    # __tablename__ = "users"

    code: Mapped[str] = mapped_column(String(10), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    email: Mapped[str | None] = mapped_column(String(100), unique=True, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    job_id: Mapped[int] = mapped_column(
        ForeignKey("jobs.id"), nullable=False, default=1
    )
    lang_id: Mapped[int] = mapped_column(
        ForeignKey("langs.id"), nullable=False, default=3
    )

    # Relationships (lazy="selectin" so they're always available after a load)
    user_groups: Mapped[list["UserUserGroupLink"]] = relationship(
        back_populates="user",
        lazy="selectin",
    )
    job: Mapped["Job"] = relationship(back_populates="users", lazy="selectin")
    lang: Mapped["Lang"] = relationship(back_populates="users", lazy="selectin")

    # ------------------------------------------------------------------
    # Computed properties — mirror the pattern used in Job model.
    # Both rely on already-loaded selectin relationships so they are
    # safe to call synchronously after any ORM fetch.
    # ------------------------------------------------------------------

    @property
    def groups(self) -> list[str]:
        return [
            link.user_group.name
            for link in self.user_groups
            if link.user_group and link.user_group.name
        ]

    # NOTE: `operations` cannot be a property because it requires an
    # async multi-join query (UserRepository.get_user_operations).
    # It is populated by UserService after every ORM fetch.

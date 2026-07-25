from typing import TYPE_CHECKING

from sqlalchemy import Boolean, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.api_v1.base.base_model import Base
from backend.api_v1.base.models import IntIdPkMixin, TimestampMixin

if TYPE_CHECKING:
    from backend.api_v1.process_roles.process_role.process_role_model import ProcessRole


class Process(IntIdPkMixin, TimestampMixin, Base):
    __tablename__ = "processes"
    __table_args__ = (UniqueConstraint("key", name="uq_process_key"),)

    name: Mapped[str] = mapped_column(String(128), nullable=False)
    key: Mapped[str | None] = mapped_column(String(64), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    roles: Mapped[list["ProcessRole"]] = relationship(
        back_populates="process",
        lazy="selectin",
    )

    def __repr__(self) -> str:
        return f"<Process(id={self.id}, name='{self.name}', key='{self.key}')>"

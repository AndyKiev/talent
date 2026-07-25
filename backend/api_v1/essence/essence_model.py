# backend/api_v1/essence/essence_model.py
from typing import TYPE_CHECKING

from sqlalchemy import String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.api_v1.base.base_model import Base
from backend.api_v1.base.models.utils.mixins import IntIdPkMixin, TimestampMixin

if TYPE_CHECKING:
    from backend.api_v1.operation_essence_link.operation_essence_link_model import (
        OperationEssenceLink,
    )


class Essence(IntIdPkMixin, TimestampMixin, Base):
    """
    A domain object / resource that can be access-controlled.

    Examples: employee, department, edi_task, talent_audit …

    The `name` value is the stable key referenced by EssenceName enum and by
    has_access() checks at runtime.  Rename with care — existing permission
    rows in the DB use this value.
    """

    name: Mapped[str] = mapped_column(String(128), nullable=False, unique=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    # One Essence → many OperationEssenceLink rows (one per allowed verb)
    operation_links: Mapped[list["OperationEssenceLink"]] = relationship(
        back_populates="essence",
        lazy="selectin",
        cascade="all, delete-orphan",
    )

    @property
    def allowed_operations(self) -> list[str]:
        """Names of operations (verbs) linked to this essence."""
        return [link.operation.name for link in self.operation_links if link.operation]

    def __repr__(self) -> str:
        return f"<Essence(id={self.id}, name='{self.name}')>"

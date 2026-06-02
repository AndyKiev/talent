# backend/api_v1/operation_essence_link/operation_essence_link_model.py
#
# This table is the heart of Tier 1 access control.
# Each row means: "operation X is allowed on essence Y".
# User groups are then granted specific OEL rows via UserGroupOperationEssenceLink.
#
from typing import TYPE_CHECKING
from sqlalchemy import Integer, ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.api_v1.base.base_model import Base
from backend.api_v1.base.models.utils.mixins import IntIdPkMixin

if TYPE_CHECKING:
    from backend.api_v1.operation.operation_model import Operation
    from backend.api_v1.essence.essence_model import Essence
    from backend.api_v1.table_relationship_links.user_group_operation_essence_link_model import (
        UserGroupOperationEssenceLink,
    )


class OperationEssenceLink(IntIdPkMixin, Base):
    """
    A specific permission: (operation_id, essence_id) pair.

    Examples:
        operation.name='view',   essence.name='employee'   → can list/read employees
        operation.name='create', essence.name='department'  → can create departments

    Uniqueness is enforced at DB level — one row per (operation, essence) pair.
    """

    __table_args__ = (
        UniqueConstraint("operation_id", "essence_id", name="uq_oel_operation_essence"),
    )

    operation_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("operations.id", ondelete="CASCADE"), nullable=False
    )
    essence_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("essences.id", ondelete="CASCADE"), nullable=False
    )

    # ── Relationships ─────────────────────────────────────────────────────────
    operation: Mapped["Operation"] = relationship(
        back_populates="essence_links",
        lazy="selectin",
    )
    essence: Mapped["Essence"] = relationship(
        back_populates="operation_links",
        lazy="selectin",
    )
    # Groups that have been granted this specific permission
    user_group_links: Mapped[list["UserGroupOperationEssenceLink"]] = relationship(
        back_populates="operation_essence_link",
        lazy="selectin",
        cascade="all, delete-orphan",
    )

    @property
    def operation_name(self) -> str:
        return self.operation.name if self.operation else ""

    @property
    def essence_name(self) -> str:
        return self.essence.name if self.essence else ""

    def __repr__(self) -> str:
        return (
            f"<OperationEssenceLink(id={self.id}, "
            f"operation='{self.operation_name}', "
            f"essence='{self.essence_name}')>"
        )

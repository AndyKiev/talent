# backend/api_v1/operation_essence_set_link/operation_essence_set_link_model.py
#
# The new-grain permission row. Mirrors OperationEssenceLink, but its subject
# is an EssenceSet instead of a single Essence.
#
#     (operation_id, essence_set_id)
#       e.g. (delete, {talent_period, talent_status})  -- atomic
#
# AND-semantics: holding (delete, {A,B}) grants nothing toward an endpoint
# guarding (delete, {A}); they are different sets, different permissions.
#
# Coexists with the legacy OperationEssenceLink during transition. The legacy
# table stays the source of truth until cutover; this is its set-grain sibling.
#
from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, Integer, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.api_v1.base.base_model import Base
from backend.api_v1.base.models.utils.mixins import IntIdPkMixin

if TYPE_CHECKING:
    from backend.api_v1.essence_set.essence_set_model import EssenceSet
    from backend.api_v1.operation.operation_model import Operation
    from backend.api_v1.table_relationship_links.user_group_operation_essence_set_link_model import (
        UserGroupOperationEssenceSetLink,
    )


class OperationEssenceSetLink(IntIdPkMixin, Base):
    """
    A permission: (operation_id, essence_set_id).

    Uniqueness is enforced at DB level — one row per (operation, essence_set).
    Because the essence_set itself is unique by fingerprint, this transitively
    guarantees one permission per (operation, canonical-set-of-essences).
    """

    __table_args__ = (
        UniqueConstraint(
            "operation_id",
            "essence_set_id",
            name="uq_oesl_operation_essence_set",
        ),
    )

    operation_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("operations.id", ondelete="CASCADE"), nullable=False
    )
    essence_set_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("essence_sets.id", ondelete="CASCADE"), nullable=False
    )

    # ── Relationships ─────────────────────────────────────────────────────────
    operation: Mapped["Operation"] = relationship(
        lazy="selectin",
    )
    essence_set: Mapped["EssenceSet"] = relationship(
        back_populates="operation_links",
        lazy="selectin",
    )
    # Groups granted this specific permission
    user_group_links: Mapped[list["UserGroupOperationEssenceSetLink"]] = relationship(
        back_populates="operation_essence_set_link",
        lazy="selectin",
        cascade="all, delete-orphan",
    )

    @property
    def operation_name(self) -> str:
        return self.operation.name if self.operation else ""

    @property
    def essence_names(self) -> list[str]:
        return self.essence_set.essence_names if self.essence_set else []

    @property
    def fingerprint(self) -> str:
        return self.essence_set.fingerprint if self.essence_set else ""

    def __repr__(self) -> str:
        return (
            f"<OperationEssenceSetLink(id={self.id}, "
            f"operation='{self.operation_name}', "
            f"essence_set='{self.fingerprint}')>"
        )

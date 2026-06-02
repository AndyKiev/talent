# backend/api_v1/essence_set/essence_set_model.py
#
# An EssenceSet is the atomic *subject* of a permission.
#
# Tier-1 access control historically pinned a permission to a single essence:
#     (operation, essence)            e.g. (delete, talent_period)
#
# An EssenceSet generalises that subject to an unordered *set* of essences:
#     (operation, {essence, ...})     e.g. (delete, {talent_period, talent_status})
#
# A single essence is simply a set of size one — there is no special-casing
# anywhere in the system.
#
# Set identity is order-independent and is established by `fingerprint`:
#   sort the member essence ids ascending, join with '-'  →  "3-7"
# The column is UNIQUE, so the database itself guarantees that the same set
# of essences can never be stored twice, regardless of insertion order.
#
# Assumption: essence ids are always positive integers (DB primary keys),
# so '-' as a delimiter can never collide with a sign character.
#
from typing import TYPE_CHECKING
from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.api_v1.base.base_model import Base
from backend.api_v1.base.models.utils.mixins import IntIdPkMixin

if TYPE_CHECKING:
    from backend.api_v1.essence_set.essence_set_member_model import EssenceSetMember
    from backend.api_v1.operation_essence_set_link.operation_essence_set_link_model import (
        OperationEssenceSetLink,
    )


class EssenceSet(IntIdPkMixin, Base):
    """
    A canonicalised, order-independent set of essences.

    `fingerprint` is the sorted member-id list joined by '-', e.g. "3-7".
    It is UNIQUE: one row per distinct set of essences.
    """

    fingerprint: Mapped[str] = mapped_column(
        String(256), nullable=False, unique=True, index=True
    )

    # ── Relationships ─────────────────────────────────────────────────────────
    members: Mapped[list["EssenceSetMember"]] = relationship(
        back_populates="essence_set",
        lazy="selectin",
        cascade="all, delete-orphan",
    )
    # Permission rows whose subject is this set
    operation_links: Mapped[list["OperationEssenceSetLink"]] = relationship(
        back_populates="essence_set",
        lazy="selectin",
        cascade="all, delete-orphan",
    )

    @property
    def essence_ids(self) -> list[int]:
        """Sorted member essence ids — the canonical representation of the set."""
        return sorted(m.essence_id for m in self.members)

    @property
    def essence_names(self) -> list[str]:
        """Member essence names, ordered to match `essence_ids`."""
        ordered = sorted(self.members, key=lambda m: m.essence_id)
        return [m.essence.name for m in ordered if m.essence]

    def __repr__(self) -> str:
        return f"<EssenceSet(id={self.id}, fingerprint='{self.fingerprint}')>"

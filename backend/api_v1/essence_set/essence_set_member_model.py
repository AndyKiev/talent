# backend/api_v1/essence_set/essence_set_member_model.py
#
# Junction: which essences belong to which EssenceSet.
#
# The EssenceSet.fingerprint column is what establishes set *identity* and
# enables O(1) order-independent lookup. This member table is what lets us
# read back *which* essences a set actually contains — for display, joins,
# and referential integrity (FK to essences).
#
from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, Integer, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.api_v1.base.base_model import Base
from backend.api_v1.base.models.utils.mixins import IntIdPkMixin

if TYPE_CHECKING:
    from backend.api_v1.essence.essence_model import Essence
    from backend.api_v1.essence_set.essence_set_model import EssenceSet


class EssenceSetMember(IntIdPkMixin, Base):
    """One (essence_set, essence) membership row."""

    __table_args__ = (
        UniqueConstraint(
            "essence_set_id",
            "essence_id",
            name="uq_essence_set_member",
        ),
    )

    essence_set_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("essence_sets.id", ondelete="CASCADE"),
        nullable=False,
    )
    essence_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("essences.id", ondelete="CASCADE"),
        nullable=False,
    )

    # ── Relationships ─────────────────────────────────────────────────────────
    essence_set: Mapped["EssenceSet"] = relationship(
        back_populates="members",
        lazy="selectin",
    )
    essence: Mapped["Essence"] = relationship(
        lazy="selectin",
    )

    def __repr__(self) -> str:
        return (
            f"<EssenceSetMember(essence_set_id={self.essence_set_id}, "
            f"essence_id={self.essence_id})>"
        )

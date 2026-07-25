# backend/api_v1/table_relationship_links/user_group_operation_essence_set_link_model.py
#
# Grants a UserGroup a specific set-grain permission (OperationEssenceSetLink).
#
# Relation chain for enforcement (set-grain):
#   Employee
#     → EmployeeUserGroupLink
#       → UserGroup  (where user_group_type.name == 'authorisation')
#         → UserGroupOperationEssenceSetLink
#           → OperationEssenceSetLink
#               → Operation (name='delete') + EssenceSet ({talent_period, talent_status})
#
# Set-grain sibling of UserGroupOperationEssenceLink. Both coexist during
# transition; this one is populated by the backfill and by all new writes.
#
from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, Integer, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.api_v1.base.base_model import Base
from backend.api_v1.base.models.utils.mixins import IntIdPkMixin

if TYPE_CHECKING:
    from backend.api_v1.operation_essence_set_link.operation_essence_set_link_model import (
        OperationEssenceSetLink,
    )
    from backend.api_v1.user_group.user_group_model import UserGroup


class UserGroupOperationEssenceSetLink(IntIdPkMixin, Base):
    """
    Many-to-many between UserGroup and OperationEssenceSetLink.
    One row = "this group holds this (verb, set-of-essences) permission".
    """

    __table_args__ = (
        UniqueConstraint(
            "user_group_id",
            "operation_essence_set_link_id",
            name="uq_ugoesl_group_oesl",
        ),
    )

    user_group_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("user_groups.id", ondelete="CASCADE"), nullable=False
    )
    operation_essence_set_link_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("operation_essence_set_links.id", ondelete="CASCADE"),
        nullable=False,
    )

    # ── Relationships ─────────────────────────────────────────────────────────
    user_group: Mapped["UserGroup"] = relationship(
        back_populates="operation_essence_set_links",
        lazy="selectin",
    )
    operation_essence_set_link: Mapped["OperationEssenceSetLink"] = relationship(
        back_populates="user_group_links",
        lazy="selectin",
    )

    def __repr__(self) -> str:
        return (
            f"<UserGroupOperationEssenceSetLink("
            f"user_group_id={self.user_group_id}, "
            f"oesl_id={self.operation_essence_set_link_id})>"
        )

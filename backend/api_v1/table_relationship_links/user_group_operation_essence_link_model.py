# backend/api_v1/user_group_operation_essence_link/user_group_operation_essence_link_model.py
#
# Grants a UserGroup a specific (operation, essence) permission.
#
# Relation chain for enforcement:
#   Employee
#     → EmployeeUserGroupLink
#       → UserGroup  (where user_group_type.name == 'authorisation')
#         → UserGroupOperationEssenceLink
#           → OperationEssenceLink
#               → Operation (name='view') + Essence (name='employee')
#
from typing import TYPE_CHECKING
from sqlalchemy import Integer, ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.api_v1.base.base_model import Base
from backend.api_v1.base.models.utils.mixins import IntIdPkMixin

if TYPE_CHECKING:
    from backend.api_v1.user_group.user_group_model import UserGroup
    from backend.api_v1.operation_essence_link.operation_essence_link_model import (
        OperationEssenceLink,
    )


class UserGroupOperationEssenceLink(IntIdPkMixin, Base):
    """
    Many-to-many between UserGroup and OperationEssenceLink.
    One row = "this group has this (verb, resource) permission".
    """

    __table_args__ = (
        UniqueConstraint(
            "user_group_id",
            "operation_essence_link_id",
            name="uq_ugoel_group_oel",
        ),
    )

    user_group_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("user_groups.id", ondelete="CASCADE"), nullable=False
    )
    operation_essence_link_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("operation_essence_links.id", ondelete="CASCADE"),
        nullable=False,
    )

    # ── Relationships ─────────────────────────────────────────────────────────
    user_group: Mapped["UserGroup"] = relationship(
        back_populates="operation_essence_links",
        lazy="selectin",
    )
    operation_essence_link: Mapped["OperationEssenceLink"] = relationship(
        back_populates="user_group_links",
        lazy="selectin",
    )

    def __repr__(self) -> str:
        return (
            f"<UserGroupOperationEssenceLink("
            f"user_group_id={self.user_group_id}, "
            f"oel_id={self.operation_essence_link_id})>"
        )

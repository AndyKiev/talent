# backend/api_v1/models/operation_user_group_link_model.py
from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.api_v1.base.base_model import Base
from backend.api_v1.base.models.utils.mixins import IntIdPkMixin

if TYPE_CHECKING:
    from backend.api_v1.operation.operation_model import Operation
    from backend.api_v1.user_group.user_group_model import UserGroup


class OperationUserGroupLink(IntIdPkMixin, Base):
    # __tablename__ = "operation_user_group_link"
    __table_args__ = (
        UniqueConstraint(
            "operation_id",
            "user_group_id",
            name="idx_uq_operation_user_group",
        ),
    )
    operation_id: Mapped[int] = mapped_column(ForeignKey("operations.id"))
    user_group_id: Mapped[int] = mapped_column(ForeignKey("user_groups.id"))

    operation: Mapped["Operation"] = relationship(
        back_populates="_user_groups", lazy="selectin"
    )
    user_group: Mapped["UserGroup"] = relationship(
        # UserGroup no longer exposes an `operations` relationship — access is
        # now modelled via essence / essence-set links. One-directional only.
        lazy="selectin",
    )

from typing import TYPE_CHECKING
from sqlalchemy import Integer, String, Text, Boolean, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.api_v1.base.models.utils.mixins import IntIdPkMixin
from backend.api_v1.base.base_model import Base

if TYPE_CHECKING:
    from backend.api_v1.table_relationship_links.employee_user_group_link_model import (
        EmployeeUserGroupLink,
    )
    from backend.api_v1.table_relationship_links import (
        OperationUserGroupLink,
    )
    from backend.api_v1.table_relationship_links.job_user_group_link_model import (
        JobUserGroupLink,
    )
    from backend.api_v1.user_group_type.user_group_type_model import UserGroupType


class UserGroup(IntIdPkMixin, Base):
    name: Mapped[str] = mapped_column(String(128))
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_protected: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    user_group_type_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("user_group_types.id"), nullable=False
    )

    # Relationships
    user_group_type: Mapped["UserGroupType"] = relationship(
        back_populates="user_groups",
        lazy="selectin",
    )
    employees: Mapped[list["EmployeeUserGroupLink"]] = relationship(
        back_populates="user_group",
        lazy="selectin",
    )
    jobs: Mapped[list["JobUserGroupLink"]] = relationship(
        back_populates="user_group",
        lazy="selectin",
    )
    operations: Mapped[list["OperationUserGroupLink"]] = relationship(
        back_populates="user_group",
        lazy="selectin",
    )

    def __repr__(self):
        return f"<UserGroup(id={self.id}, name='{self.name}')>"

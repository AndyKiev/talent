# backend/api_v1/user_group/user_group_model.py
from typing import TYPE_CHECKING
from sqlalchemy import Integer, String, Text, Boolean, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.api_v1.base.models.utils.mixins import IntIdPkMixin
from backend.api_v1.base.base_model import Base

if TYPE_CHECKING:
    from backend.api_v1.table_relationship_links.employee_user_group_link_model import (
        EmployeeUserGroupLink,
    )
    from backend.api_v1.table_relationship_links.job_user_group_link_model import (
        JobUserGroupLink,
    )
    from backend.api_v1.user_group_type.user_group_type_model import UserGroupType
    from backend.api_v1.table_relationship_links.user_group_operation_essence_link_model import (
        UserGroupOperationEssenceLink,
    )
    from backend.api_v1.table_relationship_links.user_group_operation_essence_set_link_model import (
        UserGroupOperationEssenceSetLink,
    )


class UserGroup(IntIdPkMixin, Base):
    name: Mapped[str] = mapped_column(String(128))
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_protected: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    user_group_type_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("user_group_types.id"), nullable=False
    )

    # ── Relationships ─────────────────────────────────────────────────────────
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

    # Tier 1: (verb, essence) permission grants for this group
    operation_essence_links: Mapped[list["UserGroupOperationEssenceLink"]] = (
        relationship(
            back_populates="user_group",
            lazy="selectin",
            cascade="all, delete-orphan",
        )
    )

    # Tier 1 (new set grain): (verb, {essence, ...}) grants for this group.
    # Coexists with the legacy grain above during transition.
    operation_essence_set_links: Mapped[list["UserGroupOperationEssenceSetLink"]] = (
        relationship(
            back_populates="user_group",
            lazy="selectin",
            cascade="all, delete-orphan",
        )
    )

    # ── Computed helpers ──────────────────────────────────────────────────────

    @property
    def permissions(self) -> frozenset[tuple[str, str]]:
        """
        Returns a frozenset of (operation_name, essence_name) tuples.
        Used by the permission resolver to build the user's permission set.
        """
        result: set[tuple[str, str]] = set()
        for ugoel in self.operation_essence_links:
            oel = ugoel.operation_essence_link
            if oel and oel.operation and oel.essence:
                result.add((oel.operation.name, oel.essence.name))
        return frozenset(result)

    @property
    def oel_ids(self) -> list[int]:
        """IDs of OperationEssenceLink rows currently granted to this group (legacy grain)."""
        return [
            ugoel.operation_essence_link_id for ugoel in self.operation_essence_links
        ]

    @property
    def permission_sets(self) -> frozenset[tuple[str, frozenset[str]]]:
        """
        (verb, {essence_name, ...}) grants held by this group, set-grain.

        Each element's second member is a frozenset of essence names, so the
        whole structure is hashable and order-independent: {'a','b'} == {'b','a'}.
        A single-essence permission is simply a one-element frozenset.
        """
        result: set[tuple[str, frozenset[str]]] = set()
        for ugoesl in self.operation_essence_set_links:
            oesl = ugoesl.operation_essence_set_link
            if not oesl or not oesl.operation:
                continue
            verb = oesl.operation.name
            essence_names = frozenset(oesl.essence_names)
            if essence_names:
                result.add((verb, essence_names))
        return frozenset(result)

    @property
    def oesl_ids(self) -> list[int]:
        """IDs of OperationEssenceSetLink rows currently granted to this group (set grain)."""
        return [
            ugoesl.operation_essence_set_link_id
            for ugoesl in self.operation_essence_set_links
        ]

    @property
    def user_group_type_name(self) -> str | None:
        """Name of the UserGroupType this group belongs to."""
        return self.user_group_type.name if self.user_group_type else None

    def __repr__(self) -> str:
        return f"<UserGroup(id={self.id}, name='{self.name}')>"

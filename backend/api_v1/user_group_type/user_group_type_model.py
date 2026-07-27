from typing import TYPE_CHECKING

from sqlalchemy import Boolean, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.api_v1.base.base_model import Base
from backend.api_v1.base.models import IntIdPkMixin, TimestampMixin

if TYPE_CHECKING:
    from backend.api_v1.user_group.user_group_model import UserGroup


class UserGroupType(IntIdPkMixin, TimestampMixin, Base):

    name: Mapped[str] = mapped_column(String(128), nullable=False, unique=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    # Marks the type whose groups carry access-control grants (was matched by
    # name == "authorisation"). Flag, not name/id, so renaming is safe.
    is_authorisation: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False
    )

    # lazy="noload" — NOT selectin. This relationship sits on a cycle: each
    # UserGroup selectin-loads employees / jobs / both grant grains, and every
    # member EmployeeUserGroupLink selectin-loads its Employee with its own
    # ~13-way web. Eager-loading it exploded BOTH directions:
    #   forward  — a 3-row /admin/user_group_types lookup pulled the whole
    #              access-grant graph (~1 s, scaling with headcount);
    #   backward — UserGroup.user_group_type (still selectin, a cheap many-to-one
    #              to this small table) came back through here and dragged every
    #              sibling group of that type plus all their members.
    # noload here truncates the cycle at the type row, so the reverse direction
    # needs no change. The schema's `groups` field (group NAMES) is filled by
    # UserGroupTypeService from a column query — see user_group_minis.py.
    user_groups: Mapped[list["UserGroup"]] = relationship(
        back_populates="user_group_type",
        lazy="noload",
    )

    def __repr__(self) -> str:
        return f"<UserGroupType(id={self.id}, name='{self.name}')>"

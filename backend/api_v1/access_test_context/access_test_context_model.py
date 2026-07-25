from __future__ import annotations

from sqlalchemy import JSON, ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from backend.api_v1.base.base_model import Base
from backend.api_v1.base.models import IntIdPkMixin, TimestampMixin


class AccessTestContext(IntIdPkMixin, TimestampMixin, Base):
    """Per-user 'test as group(s)' state for manual access-control testing.

    One row per employee = the developer is currently impersonating the listed
    authorisation groups (losing his own bypass/dev rights). No row = normal.
    `group_ids` is the JSON list of UserGroup ids being impersonated. Persisted
    in the DB so the mode is shared across all the user's pages and survives a
    reload. NOT stored on the employees table.
    """

    __tablename__ = "access_test_contexts"
    __table_args__ = (UniqueConstraint("employee_id", name="uq_access_test_employee"),)

    employee_id: Mapped[int] = mapped_column(
        ForeignKey("employees.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    group_ids: Mapped[list[int] | None] = mapped_column(JSON, nullable=True)

    def __repr__(self) -> str:
        return (
            f"<AccessTestContext(employee_id={self.employee_id}, "
            f"group_ids={self.group_ids})>"
        )

from typing import TYPE_CHECKING

from sqlalchemy import Boolean, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.api_v1.base.base_model import Base
from backend.api_v1.base.models.utils.mixins import IntIdPkMixin, TimestampMixin

if TYPE_CHECKING:
    from backend.api_v1.job_group.job_group_model import JobGroup


class JobGroupType(IntIdPkMixin, TimestampMixin, Base):
    """
    Classifies job groups (e.g. "Skill", "Level", "Domain").

    allow_multiple — when True a job may belong to several groups of this type
    simultaneously; when False only one group of this type is permitted per job.
    The constraint is enforced in JobJobGroupLinkService via
    JobGroupTypeSingletonViolation.
    """

    name: Mapped[str] = mapped_column(String(128), nullable=False, unique=True)
    key: Mapped[str] = mapped_column(String(32), nullable=False, unique=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    allow_multiple: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    job_groups: Mapped[list["JobGroup"]] = relationship(
        back_populates="job_group_type",
        lazy="selectin",
    )

    @property
    def groups(self) -> list[str]:
        return [jg.name for jg in self.job_groups if jg.name]

    def __repr__(self) -> str:
        return (
            f"<JobGroupType(id={self.id}, name='{self.name}', "
            f"allow_multiple={self.allow_multiple})>"
        )

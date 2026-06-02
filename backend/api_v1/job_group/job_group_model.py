from typing import TYPE_CHECKING
from sqlalchemy import Integer, String, Text, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.api_v1.base.models.utils.mixins import IntIdPkMixin
from backend.api_v1.base.base_model import Base

if TYPE_CHECKING:
    from backend.api_v1.job_group_type.job_group_type_model import JobGroupType
    from backend.api_v1.job_job_group_link.job_job_group_link_model import JobJobGroupLink


class JobGroup(IntIdPkMixin, Base):
    name: Mapped[str] = mapped_column(String(128), nullable=False, unique=True)
    key: Mapped[str | None] = mapped_column(String(64), nullable=True, unique=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    job_group_type_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("job_group_types.id"), nullable=False
    )

    # Relationships
    job_group_type: Mapped["JobGroupType"] = relationship(
        back_populates="job_groups",
        lazy="selectin",
    )
    jobs: Mapped[list["JobJobGroupLink"]] = relationship(
        back_populates="job_group",
        lazy="selectin",
    )

    def __repr__(self):
        return f"<JobGroup(id={self.id}, name='{self.name}')>"
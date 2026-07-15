from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, Integer, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.api_v1.base.base_model import Base
from backend.api_v1.base.models.utils.mixins import IntIdPkMixin

if TYPE_CHECKING:
    from backend.api_v1.job_requirement_group.job_requirement_group_model import (
        JobRequirementGroup,
    )
    from backend.api_v1.recruitment_dimension.recruitment_dimension_model import (
        RecruitmentDimension,
    )


class JobRequirementItem(IntIdPkMixin, Base):
    __tablename__ = "job_requirement_items"

    group_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("job_requirement_groups.id", ondelete="CASCADE"),
        nullable=False,
    )
    dimension_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("recruitment_dimensions.id", ondelete="RESTRICT"),
        nullable=False,
    )
    text: Mapped[str] = mapped_column(Text, nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    # Relationships
    group: Mapped["JobRequirementGroup"] = relationship(
        back_populates="items",
    )
    dimension: Mapped["RecruitmentDimension"] = relationship(
        back_populates="items",
        lazy="selectin",
    )

    def __repr__(self) -> str:
        return (
            f"<JobRequirementItem(id={self.id}, group_id={self.group_id}, "
            f"dimension_id={self.dimension_id})>"
        )

from typing import TYPE_CHECKING
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import String, Integer
from backend.api_v1.base.base_model import Base
from backend.api_v1.base.models.utils.mixins import IntIdPkMixin, TimestampMixin

if TYPE_CHECKING:
    from backend.api_v1.job_job_category_link.job_job_category_link_model import (
        JobJobCategoryLink,
    )
    from backend.api_v1.training_type_job_category_link.training_type_job_category_link_model import (
        TrainingTypeJobCategoryLink,
    )


class JobCategory(IntIdPkMixin, TimestampMixin, Base):
    """
    A job category (e.g. ``manager`` / ``employee``). Identity is the snake_case
    ``key``; the human label is resolved on the frontend via
    ``getString(snakeToCamel(key))`` — there is no stored ``name``. ``description``
    is optional free text. ``sort_order`` drives the in-grid arrow reorder.

    Linked to jobs 1:1 through ``job_job_category_links`` (a job has at most one
    category). Never a column on ``jobs`` — see the /optional-essence-property
    pattern.
    """

    __tablename__ = "job_categories"

    key: Mapped[str] = mapped_column(String(64), nullable=False, unique=True)
    description: Mapped[str | None] = mapped_column(String(256), nullable=True)
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    job_links: Mapped[list["JobJobCategoryLink"]] = relationship(
        back_populates="job_category",
        lazy="selectin",
    )

    # Training types that require this job category (many-to-many, "by_job_category")
    training_type_links: Mapped[list["TrainingTypeJobCategoryLink"]] = relationship(
        back_populates="job_category",
        lazy="selectin",
    )

    def __repr__(self) -> str:
        return f"<JobCategory(id={self.id}, key='{self.key}')>"

from typing import TYPE_CHECKING
from sqlalchemy import Integer, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.api_v1.base.base_model import Base
from backend.api_v1.base.models.utils.mixins import IntIdPkMixin, TimestampMixin

if TYPE_CHECKING:
    from backend.api_v1.job.job_model import Job
    from backend.api_v1.job_category.job_category_model import JobCategory


class JobJobCategoryLink(IntIdPkMixin, TimestampMixin, Base):
    """
    1:1 link between a Job and a JobCategory — a job has AT MOST ONE category.

    Unlike the many-to-many ``job_job_group_links`` (unique on the *pair*),
    uniqueness here is on ``job_id`` ALONE, so a single job can never carry two
    categories. Editing a job's category is therefore an upsert (replace), not a
    blind insert.

    BOTH foreign keys are ``ondelete="CASCADE"``: deleting a job OR a job category
    removes the link row automatically at the DB level — no service code needed.
    This is a deliberate divergence from ``job_job_group_link``'s plain FKs and is
    the core of the /optional-essence-property pattern.
    """

    __tablename__ = "job_job_category_links"

    job_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("jobs.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
    )
    job_category_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("job_categories.id", ondelete="CASCADE"),
        nullable=False,
    )

    job: Mapped["Job"] = relationship(back_populates="category_link", lazy="selectin")
    job_category: Mapped["JobCategory"] = relationship(
        back_populates="job_links", lazy="selectin"
    )

    def __repr__(self) -> str:
        return (
            f"<JobJobCategoryLink(job_id={self.job_id}, "
            f"job_category_id={self.job_category_id})>"
        )

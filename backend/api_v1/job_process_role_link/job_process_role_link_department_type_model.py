from typing import TYPE_CHECKING
from sqlalchemy import Integer, ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.api_v1.base.base_model import Base
from backend.api_v1.base.models.utils.mixins import IntIdPkMixin, TimestampMixin

if TYPE_CHECKING:
    from backend.api_v1.job_process_role_link.job_process_role_link_model import (
        JobProcessRoleLink,
    )
    from backend.api_v1.department_type.department_type_model import DepartmentType


class JobProcessRoleLinkDepartmentType(IntIdPkMixin, TimestampMixin, Base):
    """A department type whose EMPLOYEES a job↔process-role link oversees.

    NOT the staffing link (department_type_job_links = where the job's holders
    work): this is the oversight TARGET dimension — "the holder of this job is
    the '<role>' for employees whose main department has this type". The
    oversight auto-assignment resolves the curator job from the subordinate's
    department type through these rows.
    """

    __tablename__ = "job_process_role_link_department_types"
    __table_args__ = (
        UniqueConstraint(
            "job_process_role_link_id",
            "department_type_id",
            name="uq_jprl_department_type",
        ),
    )

    job_process_role_link_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("job_process_role_links.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    department_type_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("department_types.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )

    link: Mapped["JobProcessRoleLink"] = relationship(
        back_populates="department_type_links"
    )
    department_type: Mapped["DepartmentType"] = relationship(lazy="selectin")

    def __repr__(self) -> str:
        return (
            f"<JobProcessRoleLinkDepartmentType(link_id={self.job_process_role_link_id}, "
            f"department_type_id={self.department_type_id})>"
        )

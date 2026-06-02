from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import String, Boolean
from backend.api_v1.base.base_model import Base
from backend.api_v1.base.models.utils.mixins import IntIdPkMixin, TimestampMixin
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from backend.api_v1.employee.employee_model import Employee
    from backend.api_v1.table_relationship_links.job_user_group_link_model import JobUserGroupLink
    from backend.api_v1.department_type_job_link.department_type_job_link_model import DepartmentTypeJobLink
    from backend.api_v1.job_job_group_link.job_job_group_link_model import JobJobGroupLink


class Job(IntIdPkMixin, TimestampMixin, Base):
    name: Mapped[str] = mapped_column(String(128), nullable=False, unique=True)
    short_name: Mapped[str | None] = mapped_column(String(64), nullable=True)
    key: Mapped[str | None] = mapped_column(String(64), nullable=True)
    description: Mapped[str] = mapped_column(String(256), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    # Relationships
    employees: Mapped[list["Employee"]] = relationship(back_populates="job")

    user_groups: Mapped[list["JobUserGroupLink"]] = relationship(
        back_populates="job",
        lazy="selectin",
    )

    job_groups: Mapped[list["JobJobGroupLink"]] = relationship(
        back_populates="job",
        lazy="selectin",
    )

    # Many-to-many with DepartmentType via DepartmentTypeJobLink
    _department_types: Mapped[list["DepartmentTypeJobLink"]] = relationship(
        back_populates="job",
        lazy="noload",
    )

    @property
    def department_types(self) -> list:
        return [link.department_type for link in self._department_types if link.department_type]

    @property
    def department_type_links(self) -> list[dict]:
        """
        Department types linked to this job, each carrying the link's own
        is_active flag (from department_type_job_links). Requires the
        _department_types relationship (and its department_type) to be
        eager-loaded — see JobRepository.get_all_with_dept_type_links.
        """
        return [
            {"name": link.department_type.name, "is_active": link.is_active}
            for link in self._department_types
            if link.department_type and link.department_type.name
        ]

    @property
    def groups(self) -> list[str]:
        return [
            link.user_group.name
            for link in self.user_groups
            if link.user_group and link.user_group.name
        ]

    @property
    def job_group_names(self) -> list[str]:
        return [
            link.job_group.name
            for link in self.job_groups
            if link.job_group and link.job_group.name
        ]
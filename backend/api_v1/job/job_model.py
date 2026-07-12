from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import String, Boolean
from backend.api_v1.base.base_model import Base
from backend.api_v1.base.models.utils.mixins import IntIdPkMixin, TimestampMixin
from typing import TYPE_CHECKING, Optional

if TYPE_CHECKING:
    from backend.api_v1.employee.employee_model import Employee
    from backend.api_v1.table_relationship_links.job_user_group_link_model import (
        JobUserGroupLink,
    )
    from backend.api_v1.department_type_job_link.department_type_job_link_model import (
        DepartmentTypeJobLink,
    )
    from backend.api_v1.job_job_group_link.job_job_group_link_model import (
        JobJobGroupLink,
    )
    from backend.api_v1.job_process_role_link.job_process_role_link_model import (
        JobProcessRoleLink,
    )
    from backend.api_v1.job_job_category_link.job_job_category_link_model import (
        JobJobCategoryLink,
    )
    from backend.api_v1.training_type_job_link.training_type_job_link_model import (
        TrainingTypeJobLink,
    )


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

    process_role_links: Mapped[list["JobProcessRoleLink"]] = relationship(
        back_populates="job",
        lazy="selectin",
    )

    # 1:1 optional category, stored as a link row (never a column on jobs).
    # ondelete=CASCADE on the link's job_id FK cleans this up when the job goes.
    category_link: Mapped[Optional["JobJobCategoryLink"]] = relationship(
        back_populates="job",
        lazy="selectin",
        uselist=False,
    )

    # Many-to-many with DepartmentType via DepartmentTypeJobLink
    _department_types: Mapped[list["DepartmentTypeJobLink"]] = relationship(
        back_populates="job",
        lazy="noload",
    )

    # Training types that recommend this job (many-to-many, "by_job" link type)
    training_type_links: Mapped[list["TrainingTypeJobLink"]] = relationship(
        back_populates="job",
        lazy="selectin",
    )

    @property
    def department_types(self) -> list:
        return [
            link.department_type
            for link in self._department_types
            if link.department_type
        ]

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

    @property
    def job_category_id(self) -> int | None:
        link = self.category_link
        return link.job_category_id if link else None

    @property
    def job_category_key(self) -> str | None:
        link = self.category_link
        return link.job_category.key if link and link.job_category else None

    @property
    def recommended_training_names(self) -> list[str]:
        return [
            link.training_type.name
            for link in self.training_type_links
            if link.training_type and link.training_type.name
        ]

    @property
    def process_role_links_info(self) -> list[dict]:
        """Process-role links as {short, full}: short prefers the role's
        short_name (compact grid chips), full = 'process / role' (tooltip)."""
        out: list[dict] = []
        for link in self.process_role_links:
            role = link.process_role
            if role is None:
                out.append({"short": "?", "full": "? / ?"})
                continue
            process_name = role.process.name if role.process else "?"
            out.append(
                {
                    "short": role.short_name or role.name,
                    "full": f"{process_name} / {role.name}",
                }
            )
        return out

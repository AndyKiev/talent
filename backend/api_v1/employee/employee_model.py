from typing import TYPE_CHECKING, List
from sqlalchemy.orm import mapped_column, Mapped, relationship
from sqlalchemy import String, Boolean, ForeignKey
from backend.api_v1.base.base_model import Base
from backend.api_v1.base.models.utils.mixins import IntIdPkMixin, TimestampMixin


if TYPE_CHECKING:
    from backend.api_v1.table_relationship_links.employee_user_group_link_model import (
        EmployeeUserGroupLink,
    )
    from backend.api_v1.employee_status.employee_status_model import EmployeeStatus
    from backend.api_v1.job.job_model import Job

    # from backend.api_v1.message.message_model import Lang
    from backend.api_v1.lang.lang_model import Lang

    from backend.api_v1.employee_department.employee_department_model import (
        EmployeeDepartment,
    )
    from backend.api_v1.employee_events.employee_event.employee_event_model import (
        EmployeeEvent,
    )
    from backend.api_v1.table_relationship_links.employee_current_level_model import (
        EmployeeCurrentLevel,
    )
    from backend.api_v1.table_relationship_links.employee_personal_data_model import (
        EmployeePersonalData,
    )


class Employee(IntIdPkMixin, TimestampMixin, Base):
    # __tablename__ = "employees"
    code: Mapped[str] = mapped_column(String(10), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    email: Mapped[str | None] = mapped_column(String(64), unique=True, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    status_id: Mapped[int] = mapped_column(
        ForeignKey("employee_statuses.id"), nullable=False, default=1
    )
    job_id: Mapped[int | None] = mapped_column(
        ForeignKey("jobs.id"), nullable=True, default=None
    )
    lang_id: Mapped[int] = mapped_column(
        ForeignKey("langs.id"), nullable=False, default=3
    )

    # Relationships (lazy="selectin" so they're always available after a load)
    user_groups: Mapped[list["EmployeeUserGroupLink"]] = relationship(
        back_populates="employee",
        lazy="selectin",
    )
    status: Mapped["EmployeeStatus"] = relationship(
        back_populates="employees", lazy="selectin"
    )
    job: Mapped["Job"] = relationship(back_populates="employees", lazy="selectin")
    lang: Mapped["Lang"] = relationship(back_populates="employees", lazy="selectin")

    departments: Mapped[List["EmployeeDepartment"]] = relationship(
        back_populates="employee",
        lazy="selectin",
    )

    # Current career level (people-review). 1:1 link table keeps it off the
    # employees table. uselist=False — at most one current level per employee.
    current_level_link: Mapped["EmployeeCurrentLevel | None"] = relationship(
        back_populates="employee",
        lazy="selectin",
        uselist=False,
    )

    # Personal data (birth date, etc.) in its own 1:1 table — keeps it off the
    # employees table. uselist=False — at most one row per employee.
    personal_data: Mapped["EmployeePersonalData | None"] = relationship(
        back_populates="employee",
        lazy="selectin",
        uselist=False,
    )

    events: Mapped[list["EmployeeEvent"]] = relationship(
        foreign_keys="[EmployeeEvent.employee_id]",
        back_populates="employee",
        lazy="selectin",
    )
    # Events created by this employee acting as HRM
    created_events: Mapped[list["EmployeeEvent"]] = relationship(
        foreign_keys="[EmployeeEvent.created_by]",
        back_populates="creator",
        lazy="selectin",
    )

    # ------------------------------------------------------------------
    # Computed properties — mirror the pattern used in Job model.
    # Both rely on already-loaded selectin relationships so they are
    # safe to call synchronously after any ORM fetch.
    # ------------------------------------------------------------------

    @property
    def groups(self) -> list[str]:
        return [
            link.user_group.name
            for link in self.user_groups
            if link.user_group and link.user_group.name
        ]

    @property
    def current_level_id(self) -> int | None:
        # Read-only mirror of the 1:1 link table, so EmployeeSchema can keep
        # serializing current_level_id. Written only via set_current_level.
        return self.current_level_link.level_id if self.current_level_link else None

    @property
    def birth_date(self):
        # Read-only mirror of the 1:1 personal-data table. Written only via
        # set_personal_data.
        return self.personal_data.birth_date if self.personal_data else None

    @property
    def hire_date(self):
        # Read-only mirror of the 1:1 personal-data table (date joined company).
        return self.personal_data.hire_date if self.personal_data else None

    @property
    def job_assigned_date(self):
        # Read-only mirror of the 1:1 personal-data table (date assigned to job).
        return self.personal_data.job_assigned_date if self.personal_data else None

    # NOTE: `operations` cannot be a property because it requires an
    # async multi-join query (UserRepository.get_user_operations).
    # It is populated by UserService after every ORM fetch.

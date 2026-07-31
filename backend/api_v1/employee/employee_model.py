import logging
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.api_v1.base.base_model import Base
from backend.api_v1.base.models.utils.mixins import IntIdPkMixin, TimestampMixin
from backend.utils.name_order import current_surname_first
from backend.utils.person_names import compose_display_name

logger = logging.getLogger(__name__)

if TYPE_CHECKING:
    from backend.api_v1.employee_department.employee_department_model import (
        EmployeeDepartment,
    )
    from backend.api_v1.employee_events.employee_event.employee_event_model import (
        EmployeeEvent,
    )
    from backend.api_v1.employee_origin.employee_origin_model import EmployeeOrigin
    from backend.api_v1.employee_responsibility_department.employee_responsibility_department_model import (
        EmployeeResponsibilityDepartment,
    )
    from backend.api_v1.employee_status.employee_status_model import EmployeeStatus
    from backend.api_v1.job.job_model import Job

    # from backend.api_v1.message.message_model import Lang
    from backend.api_v1.lang.lang_model import Lang
    from backend.api_v1.person.person_model import Person
    from backend.api_v1.table_relationship_links.employee_current_level_model import (
        EmployeeCurrentLevel,
    )
    from backend.api_v1.table_relationship_links.employee_personal_data_model import (
        EmployeePersonalData,
    )
    from backend.api_v1.table_relationship_links.employee_user_group_link_model import (
        EmployeeUserGroupLink,
    )


class Employee(IntIdPkMixin, TimestampMixin, Base):
    # __tablename__ = "employees"
    code: Mapped[str] = mapped_column(String(10), unique=True, nullable=False)
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
    # Physical person behind this employee record (names, sex, birth date).
    person_id: Mapped[int] = mapped_column(ForeignKey("persons.id"), nullable=False)
    # Origin lookup: 1=human (default, applied silently), 2=robot (system
    # accounts like ADMIN). Robots never enter people-review.
    origin_id: Mapped[int] = mapped_column(
        ForeignKey("employee_origins.id"),
        nullable=False,
        default=1,
        server_default="1",
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

    # MAIN department link (0..1 rows — uq on employee_id).
    departments: Mapped[list["EmployeeDepartment"]] = relationship(
        back_populates="employee",
        lazy="selectin",
    )

    # Departments of responsibility (0..N rows, separate table).
    responsibility_departments: Mapped[list["EmployeeResponsibilityDepartment"]] = (
        relationship(
            lazy="selectin",
        )
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

    # Physical person (names, sex, birth date). The ONLY place name parts live.
    person: Mapped["Person | None"] = relationship(
        back_populates="employees",
        lazy="selectin",
    )

    @property
    def name(self) -> str:
        """Display name composed from the person's parts, in the order the
        CURRENT VIEWER prefers (surname_first_in_names, per-user overridable).

        There is no employees.name column: this property is what every schema
        with a `name` / `employee_name` / `author_name` field reads, so flipping
        the setting changes the whole UI without touching any data.

        person_id is NOT NULL, so a missing `person` always means the
        relationship was not loaded (a noload path) — never absent data. That
        renders as the employee code rather than an empty string, so a blank
        name can never reach an audit entry unnoticed.
        """
        if self.person is None:
            logger.warning(
                "Employee.name read with person unloaded (id=%s): "
                "the query needs selectinload(Employee.person)",
                self.id,
            )
            return self.code or ""
        return compose_display_name(
            self.person.first_name,
            self.person.last_name,
            current_surname_first(),
        )

    origin: Mapped["EmployeeOrigin"] = relationship(
        back_populates="employees",
        lazy="selectin",
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
    def group_ids(self) -> list[int]:
        """User-group ids this employee belongs to (id-based, rename-safe)."""
        return [
            link.user_group_id
            for link in self.user_groups
            if link.user_group_id is not None
        ]

    @property
    def current_level_id(self) -> int | None:
        # Read-only mirror of the 1:1 link table, so EmployeeSchema can keep
        # serializing current_level_id. Written only via set_current_level.
        return self.current_level_link.level_id if self.current_level_link else None

    @property
    def birth_date(self):
        # PERSON-level fact — read from the linked person (person_id NOT NULL).
        return self.person.birth_date if self.person else None

    @property
    def hire_date(self):
        # Read-only mirror of the 1:1 personal-data table (date joined company).
        return self.personal_data.hire_date if self.personal_data else None

    @property
    def job_assigned_date(self):
        # Read-only mirror of the 1:1 personal-data table (date assigned to job).
        return self.personal_data.job_assigned_date if self.personal_data else None

    @property
    def sex(self):
        # 'male' / 'female' — PERSON-level fact, read from the linked person.
        return self.person.sex if self.person else None

    @property
    def marital_status(self):
        # 'married' / 'not_married' — PERSON-level fact, from the linked person.
        return self.person.marital_status if self.person else None

    # NOTE: `operations` cannot be a property because it requires an
    # async multi-join query (UserRepository.get_user_operations).
    # It is populated by UserService after every ORM fetch.

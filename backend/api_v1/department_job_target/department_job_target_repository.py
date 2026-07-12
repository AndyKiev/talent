from datetime import date
from typing import List, Optional

from sqlalchemy import func, select, union

from backend.api_v1.base.base_repository import BaseRepository
from backend.api_v1.department_job_target.department_job_target_model import (
    DepartmentJobTarget,
)
from backend.api_v1.employee.employee_model import Employee
from backend.api_v1.employee_department.employee_department_model import (
    EmployeeDepartment,
)
from backend.api_v1.employee_events.employee_event.employee_event_model import (
    EmployeeEvent,
)
from backend.api_v1.employee_events.employee_event_change.employee_event_change_model import (
    EmployeeEventChange,
)
from backend.api_v1.employee_events.employee_event_direction_type.employee_event_direction_type_model import (
    EmployeeEventDirectionType,
)
from backend.api_v1.employee_events.employee_event_status.employee_event_status_model import (
    EmployeeEventStatus,
)


class DepartmentJobTargetRepository(BaseRepository):
    model = DepartmentJobTarget

    async def get_by_dept_link_date(
        self, department_id: int, link_id: int, effective_date: date
    ) -> Optional[DepartmentJobTarget]:
        """Fetch a row by its unique (department, link, effective_date) triple."""
        return (
            await self.session.execute(
                select(DepartmentJobTarget).where(
                    DepartmentJobTarget.department_id == department_id,
                    DepartmentJobTarget.department_type_job_link_id == link_id,
                    DepartmentJobTarget.effective_date == effective_date,
                )
            )
        ).scalar_one_or_none()

    async def get_targets(
        self, department_id: int, link_id: Optional[int] = None
    ) -> List[DepartmentJobTarget]:
        """Target history for a department (optionally one link), newest first."""
        stmt = select(DepartmentJobTarget).where(
            DepartmentJobTarget.department_id == department_id
        )
        if link_id is not None:
            stmt = stmt.where(
                DepartmentJobTarget.department_type_job_link_id == link_id
            )
        stmt = stmt.order_by(
            DepartmentJobTarget.effective_date.desc(),
            DepartmentJobTarget.id.desc(),
        )
        return list((await self.session.execute(stmt)).scalars().all())

    async def count_by_link(self, link_id: int) -> int:
        return (
            await self.session.execute(
                select(func.count())
                .select_from(DepartmentJobTarget)
                .where(DepartmentJobTarget.department_type_job_link_id == link_id)
            )
        ).scalar_one()

    async def get_plan_as_of(self, department_id: int, on_date: date) -> dict[int, int]:
        """
        Plan qty per link as of ``on_date``: for every link with at least one
        row dated <= on_date, the qty of the LATEST such row. One DISTINCT ON
        query (Postgres).
        """
        stmt = (
            select(
                DepartmentJobTarget.department_type_job_link_id,
                DepartmentJobTarget.qty,
            )
            .distinct(DepartmentJobTarget.department_type_job_link_id)
            .where(
                DepartmentJobTarget.department_id == department_id,
                DepartmentJobTarget.effective_date <= on_date,
            )
            .order_by(
                DepartmentJobTarget.department_type_job_link_id,
                DepartmentJobTarget.effective_date.desc(),
                DepartmentJobTarget.id.desc(),
            )
        )
        rows = (await self.session.execute(stmt)).all()
        return {link_id: qty for link_id, qty in rows}

    async def get_candidate_employee_ids(self, department_id: int) -> set[int]:
        """
        Employees whose as-of state COULD place them in this department:
        currently linked to it, or having any event change into/out of it.
        Keeps the fact replay bounded instead of replaying every employee.
        """
        current = select(EmployeeDepartment.employee_id).where(
            EmployeeDepartment.department_id == department_id
        )
        via_events = (
            select(EmployeeEvent.employee_id)
            .join(
                EmployeeEventChange,
                EmployeeEventChange.event_id == EmployeeEvent.id,
            )
            .where(
                (EmployeeEventChange.new_department_id == department_id)
                | (EmployeeEventChange.prev_department_id == department_id)
            )
        )
        rows = (await self.session.execute(union(current, via_events))).scalars().all()
        return set(rows)

    async def get_event_change_rows(
        self,
        employee_ids: set[int],
        on_date: date,
        humans_only: bool,
        human_origin_id: int,
    ) -> List[tuple]:
        """
        Flattened (employee_id, effective_date, event_id, event_status_name,
        direction_code, new_job_id, new_status_id, new_department_id) rows for
        the replay: applied + ready events due by ``on_date``, in replay order.
        The event status lets the caller flag placements that still rest on a
        not-yet-applied (ready) event.
        """
        if not employee_ids:
            return []
        stmt = (
            select(
                EmployeeEvent.employee_id,
                EmployeeEvent.effective_date,
                EmployeeEvent.id,
                EmployeeEventStatus.name,
                EmployeeEventDirectionType.code,
                EmployeeEventChange.new_job_id,
                EmployeeEventChange.new_status_id,
                EmployeeEventChange.new_department_id,
            )
            .join(
                EmployeeEventChange,
                EmployeeEventChange.event_id == EmployeeEvent.id,
            )
            .join(
                EmployeeEventStatus,
                EmployeeEventStatus.id == EmployeeEvent.status_id,
            )
            .join(
                EmployeeEventDirectionType,
                EmployeeEventDirectionType.id
                == EmployeeEventChange.direction_type_id,
            )
            .join(Employee, Employee.id == EmployeeEvent.employee_id)
            .where(
                EmployeeEvent.employee_id.in_(employee_ids),
                EmployeeEventStatus.name.in_(("applied", "ready")),
                EmployeeEvent.effective_date <= on_date,
            )
            .order_by(EmployeeEvent.effective_date, EmployeeEvent.id)
        )
        if humans_only:
            stmt = stmt.where(Employee.origin_id == human_origin_id)
        return list((await self.session.execute(stmt)).all())

from collections.abc import Sequence

from sqlalchemy import select
from sqlalchemy.orm import raiseload

from backend.api_v1.base.base_repository import BaseRepository
from backend.api_v1.department.department_model import Department
from backend.api_v1.department_category.department_category_model import (
    DepartmentCategory,
)
from backend.api_v1.process_roles.process.process_model import Process
from backend.api_v1.process_roles.process_role.process_role_model import ProcessRole
from backend.api_v1.process_roles.process_role_active_context.process_role_active_context_model import (
    ProcessRoleActiveContext,
)
from backend.api_v1.process_roles.process_role_holder.process_role_holder_model import (
    ProcessRoleHolder,
)
from backend.api_v1.process_roles.process_role_holder_department_link.process_role_holder_department_link_model import (
    ProcessRoleHolderDepartmentLink,
)
from backend.api_v1.process_roles.process_role_holder_employee_link.process_role_holder_employee_link_model import (
    ProcessRoleHolderEmployeeLink,
)
from backend.api_v1.review_session_employee.review_session_employee_model import (
    ReviewSessionEmployee,
)


class ProcessRoleActiveContextRepository(BaseRepository):
    model = ProcessRoleActiveContext

    async def get_for_employee(
        self, employee_id: int
    ) -> ProcessRoleActiveContext | None:
        stmt = select(self.model).where(self.model.employee_id == employee_id)
        return await self.session.scalar(stmt)

    async def get_held_roles(
        self, employee_id: int, process_key: str
    ) -> Sequence[ProcessRole]:
        """Distinct process_roles the employee holds within the given process."""
        # raiseload(holders): ProcessRole.holders is lazy="selectin", so loading
        # the role entity would otherwise hydrate every holder -> their Employee ->
        # Employee's whole selectin graph (hundreds of queries) just so the caller
        # can read id/key/name/link_target. Nobody here touches .holders.
        stmt = (
            select(ProcessRole)
            .options(raiseload(ProcessRole.holders))
            .join(
                ProcessRoleHolder, ProcessRoleHolder.process_role_id == ProcessRole.id
            )
            .join(Process, ProcessRole.process_id == Process.id)
            .where(
                ProcessRoleHolder.holder_employee_id == employee_id,
                Process.key == process_key,
            )
            .distinct()
        )
        result = await self.session.scalars(stmt)
        return result.all()

    async def get_assigned_departments(
        self, employee_id: int, process_key: str
    ) -> Sequence[tuple[int, Department]]:
        """(process_role_id, Department) the employee supervises within the process
        (i.e. department links for any dept-target role they hold), ordered by the
        department category's sort_order then name — the display order of the
        supervisor's department select. (sort_order is selected too: Postgres
        requires DISTINCT order-by expressions in the select list.)"""
        stmt = (
            select(ProcessRole.id, Department, DepartmentCategory.sort_order)
            .select_from(ProcessRoleHolderDepartmentLink)
            .join(
                ProcessRoleHolder,
                ProcessRoleHolderDepartmentLink.process_role_holder_id
                == ProcessRoleHolder.id,
            )
            .join(ProcessRole, ProcessRoleHolder.process_role_id == ProcessRole.id)
            .join(Process, ProcessRole.process_id == Process.id)
            .join(
                Department,
                ProcessRoleHolderDepartmentLink.department_id == Department.id,
            )
            .join(
                DepartmentCategory,
                Department.department_category_id == DepartmentCategory.id,
            )
            .where(
                ProcessRoleHolder.holder_employee_id == employee_id,
                Process.key == process_key,
            )
            .distinct()
            .order_by(DepartmentCategory.sort_order, Department.name)
        )
        result = await self.session.execute(stmt)
        return [(row[0], row[1]) for row in result.all()]

    async def is_employee_in_session(self, employee_id: int, session_id: int) -> bool:
        stmt = (
            select(ReviewSessionEmployee.id)
            .where(
                ReviewSessionEmployee.session_id == session_id,
                ReviewSessionEmployee.employee_id == employee_id,
            )
            .limit(1)
        )
        return (await self.session.scalar(stmt)) is not None

    async def get_oversight_role_ids_with_session_members(
        self, employee_id: int, session_id: int, process_key: str
    ) -> Sequence[int]:
        """Employee-target (oversight) role ids the employee holds within the
        process that have at least one linked employee participating in the
        session."""
        stmt = (
            select(ProcessRoleHolder.process_role_id)
            .join(
                ProcessRoleHolderEmployeeLink,
                ProcessRoleHolderEmployeeLink.process_role_holder_id
                == ProcessRoleHolder.id,
            )
            .join(
                ReviewSessionEmployee,
                ReviewSessionEmployee.employee_id
                == ProcessRoleHolderEmployeeLink.employee_id,
            )
            .join(ProcessRole, ProcessRoleHolder.process_role_id == ProcessRole.id)
            .join(Process, ProcessRole.process_id == Process.id)
            .where(
                ProcessRoleHolder.holder_employee_id == employee_id,
                ReviewSessionEmployee.session_id == session_id,
                Process.key == process_key,
            )
            .distinct()
        )
        result = await self.session.scalars(stmt)
        return result.all()

    async def upsert(
        self,
        employee_id: int,
        process_role_id: int | None,
        department_id: int | None,
    ) -> ProcessRoleActiveContext:
        record = await self.get_for_employee(employee_id)
        if record is None:
            record = ProcessRoleActiveContext(
                employee_id=employee_id,
                process_role_id=process_role_id,
                department_id=department_id,
            )
            self.session.add(record)
        else:
            record.process_role_id = process_role_id
            record.department_id = department_id
        await self.session.commit()
        await self.session.refresh(record)
        return record

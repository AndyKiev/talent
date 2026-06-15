from typing import Optional, Sequence, Tuple

from sqlalchemy import select

from backend.api_v1.base.base_repository import BaseRepository
from backend.api_v1.process_roles.process_role_active_context.process_role_active_context_model import (
    ProcessRoleActiveContext,
)
from backend.api_v1.process_roles.process_role_holder.process_role_holder_model import (
    ProcessRoleHolder,
)
from backend.api_v1.process_roles.process_role.process_role_model import ProcessRole
from backend.api_v1.process_roles.process.process_model import Process
from backend.api_v1.process_roles.process_role_holder_department_link.process_role_holder_department_link_model import (
    ProcessRoleHolderDepartmentLink,
)
from backend.api_v1.department.department_model import Department


class ProcessRoleActiveContextRepository(BaseRepository):
    model = ProcessRoleActiveContext

    async def get_for_employee(
        self, employee_id: int
    ) -> Optional[ProcessRoleActiveContext]:
        stmt = select(self.model).where(self.model.employee_id == employee_id)
        return await self.session.scalar(stmt)

    async def get_held_roles(
        self, employee_id: int, process_key: str
    ) -> Sequence[ProcessRole]:
        """Distinct process_roles the employee holds within the given process."""
        stmt = (
            select(ProcessRole)
            .join(ProcessRoleHolder, ProcessRoleHolder.process_role_id == ProcessRole.id)
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
    ) -> Sequence[Tuple[int, Department]]:
        """(process_role_id, Department) the employee supervises within the process
        (i.e. department links for any dept-target role they hold)."""
        stmt = (
            select(ProcessRole.id, Department)
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
            .where(
                ProcessRoleHolder.holder_employee_id == employee_id,
                Process.key == process_key,
            )
            .distinct()
        )
        result = await self.session.execute(stmt)
        return [(row[0], row[1]) for row in result.all()]

    async def upsert(
        self,
        employee_id: int,
        process_role_id: Optional[int],
        department_id: Optional[int],
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

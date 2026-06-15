from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.base.base_service import BaseService
from backend.api_v1.employee.employee_schema import EmployeeSchema
from backend.api_v1.process_roles.process_role_active_context.process_role_active_context_repository import (
    ProcessRoleActiveContextRepository,
)
from backend.api_v1.process_roles.process_role_active_context.process_role_active_context_schema import (
    ActiveContextRead,
    ActiveContextUpdate,
    MyRole,
    MyDepartment,
    MyScopes,
)
from backend.api_v1.process_roles.process_role_active_context.process_role_active_context_errors import (
    ActiveContextRoleNotHeld,
    ActiveContextDepartmentNotAssigned,
)

PEOPLE_REVIEW_PROCESS_KEY = "people_review"


class ProcessRoleActiveContextService(BaseService):
    def __init__(
        self,
        repository: ProcessRoleActiveContextRepository,
        user: Optional[EmployeeSchema] = None,
        session: Optional[AsyncSession] = None,
    ):
        super().__init__(repository, user=user, session=session)

    async def get_my_scopes(self) -> MyScopes:
        emp_id = self.user.id
        held = await self.repository.get_held_roles(emp_id, PEOPLE_REVIEW_PROCESS_KEY)
        assigned = await self.repository.get_assigned_departments(
            emp_id, PEOPLE_REVIEW_PROCESS_KEY
        )
        context = await self.repository.get_for_employee(emp_id)

        roles = [
            MyRole(
                process_role_id=r.id,
                key=r.key,
                name=r.name,
                link_target=r.link_target,
            )
            for r in held
        ]
        departments = [
            MyDepartment(id=dept.id, name=dept.name, process_role_id=role_id)
            for role_id, dept in assigned
        ]
        active = (
            ActiveContextRead.model_validate(context)
            if context
            else ActiveContextRead()
        )
        return MyScopes(roles=roles, departments=departments, active=active)

    async def set_active(self, payload: ActiveContextUpdate) -> ActiveContextRead:
        emp_id = self.user.id
        role_id = payload.process_role_id
        dept_id = payload.department_id

        if role_id is None:
            # mode off — sees only self
            record = await self.repository.upsert(emp_id, None, None)
            return ActiveContextRead.model_validate(record)

        # role must be one the user actually holds
        held = await self.repository.get_held_roles(emp_id, PEOPLE_REVIEW_PROCESS_KEY)
        role = next((r for r in held if r.id == role_id), None)
        if role is None:
            raise await self._resolve_domain_error(ActiveContextRoleNotHeld(role_id))

        if role.link_target == "department":
            if dept_id is not None:
                assigned = await self.repository.get_assigned_departments(
                    emp_id, PEOPLE_REVIEW_PROCESS_KEY
                )
                allowed = {d.id for r_id, d in assigned if r_id == role_id}
                if dept_id not in allowed:
                    raise await self._resolve_domain_error(
                        ActiveContextDepartmentNotAssigned(dept_id)
                    )
        else:
            # employee-target role never carries a department
            dept_id = None

        record = await self.repository.upsert(emp_id, role_id, dept_id)
        return ActiveContextRead.model_validate(record)

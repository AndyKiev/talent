from sqlalchemy import select

from backend.api_v1.base.base_repository import BaseRepository
from backend.api_v1.process_roles.process_role_holder_department_link.process_role_holder_department_link_model import (
    ProcessRoleHolderDepartmentLink,
)
from backend.api_v1.process_roles.process_role_holder.process_role_holder_model import (
    ProcessRoleHolder,
)
from backend.api_v1.process_roles.process_role.process_role_model import ProcessRole
from backend.api_v1.process_roles.process.process_model import Process


class ProcessRoleHolderDepartmentLinkRepository(BaseRepository):
    model = ProcessRoleHolderDepartmentLink

    async def get_department_ids(
        self,
        holder_employee_id: int,
        process_key: str,
        role_key: str,
    ) -> set[int]:
        """Department ids assigned to `holder_employee_id` for a given process+role.

        Joins leaf -> holder -> role -> process and matches on the stable keys.
        Returns the set of department instances this supervisor covers — the
        roots whose subtrees the visibility resolver then expands.
        """
        stmt = (
            select(ProcessRoleHolderDepartmentLink.department_id)
            .join(
                ProcessRoleHolder,
                ProcessRoleHolderDepartmentLink.process_role_holder_id
                == ProcessRoleHolder.id,
            )
            .join(ProcessRole, ProcessRoleHolder.process_role_id == ProcessRole.id)
            .join(Process, ProcessRole.process_id == Process.id)
            .where(
                ProcessRoleHolder.holder_employee_id == holder_employee_id,
                ProcessRole.key == role_key,
                Process.key == process_key,
            )
        )
        result = await self.session.scalars(stmt)
        return set(result.all())

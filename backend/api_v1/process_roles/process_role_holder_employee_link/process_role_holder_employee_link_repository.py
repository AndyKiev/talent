from sqlalchemy import select

from backend.api_v1.base.base_repository import BaseRepository
from backend.api_v1.process_roles.process_role_holder_employee_link.process_role_holder_employee_link_model import (
    ProcessRoleHolderEmployeeLink,
)
from backend.api_v1.process_roles.process_role_holder.process_role_holder_model import (
    ProcessRoleHolder,
)
from backend.api_v1.process_roles.process_role.process_role_model import ProcessRole
from backend.api_v1.process_roles.process.process_model import Process


class ProcessRoleHolderEmployeeLinkRepository(BaseRepository):
    model = ProcessRoleHolderEmployeeLink

    async def get_roster_employee_ids(
        self,
        holder_employee_id: int,
        process_key: str,
        role_key: str,
    ) -> set[int]:
        """Employee ids covered by `holder_employee_id` for a given process+role.

        Joins leaf -> holder -> role -> process and matches on the stable keys
        (never names). Returns the set of covered employee ids — the holder's
        roster. Empty set when the holder covers nobody.
        """
        stmt = (
            select(ProcessRoleHolderEmployeeLink.employee_id)
            .join(
                ProcessRoleHolder,
                ProcessRoleHolderEmployeeLink.process_role_holder_id
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

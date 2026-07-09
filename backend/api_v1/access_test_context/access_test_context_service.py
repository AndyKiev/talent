from typing import Optional, List, Sequence

from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.base.base_service import BaseService
from backend.api_v1.employee.employee_schema import EmployeeSchema
from backend.api_v1.user_group.user_group_model import UserGroup
from backend.api_v1.access_test_context.access_test_context_repository import (
    AccessTestContextRepository,
)
from backend.api_v1.access_test_context.access_test_context_schema import (
    AccessTestState,
    AccessTestGroupOption,
    AccessTestContextSet,
)
from backend.api_v1.access_test_context.access_test_context_messages import (
    AccessTestNotAllowed,
    AccessTestInvalidGroups,
)


class AccessTestContextService(BaseService):
    def __init__(
        self,
        repository: AccessTestContextRepository,
        user: Optional[EmployeeSchema] = None,
        session: Optional[AsyncSession] = None,
    ):
        super().__init__(repository, user=user, session=session)

    def _build_state(self, record, available: Sequence[UserGroup]) -> AccessTestState:
        options = [AccessTestGroupOption(id=g.id, name=g.name) for g in available]
        selected_ids = list(record.group_ids) if record and record.group_ids else []
        name_by_id = {g.id: g.name for g in available}
        return AccessTestState(
            active=bool(selected_ids),
            group_ids=selected_ids,
            group_names=[name_by_id[i] for i in selected_ids if i in name_by_id],
            available_groups=options,
        )

    async def get_my_state(self) -> AccessTestState:
        record = await self.repository.get_for_employee(self.user.id)
        available = await self.repository.get_authorisation_groups()
        return self._build_state(record, available)

    async def set_context(self, payload: AccessTestContextSet) -> AccessTestState:
        # Only a REAL bypass user (dev) may enter/update — is_bypass is forced
        # off while testing, so we check the preserved real flag.
        if not getattr(self.user, "real_is_bypass", False):
            raise await self._resolve_domain_error(AccessTestNotAllowed())

        available = await self.repository.get_authorisation_groups()
        allowed_ids = {g.id for g in available}
        requested = list(dict.fromkeys(payload.group_ids))  # de-dupe, keep order
        if not requested or any(gid not in allowed_ids for gid in requested):
            raise await self._resolve_domain_error(AccessTestInvalidGroups())

        record = await self.repository.upsert(self.user.id, requested)
        return self._build_state(record, available)

    async def clear_context(self) -> AccessTestState:
        await self.repository.delete_for_employee(self.user.id)
        available = await self.repository.get_authorisation_groups()
        return self._build_state(None, available)

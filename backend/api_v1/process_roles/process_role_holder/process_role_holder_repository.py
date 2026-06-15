from backend.api_v1.base.base_repository import BaseRepository
from backend.api_v1.process_roles.process_role_holder.process_role_holder_model import (
    ProcessRoleHolder,
)


class ProcessRoleHolderRepository(BaseRepository):
    model = ProcessRoleHolder

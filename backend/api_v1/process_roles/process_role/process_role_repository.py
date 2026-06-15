from backend.api_v1.base.base_repository import BaseRepository
from backend.api_v1.process_roles.process_role.process_role_model import ProcessRole


class ProcessRoleRepository(BaseRepository):
    model = ProcessRole

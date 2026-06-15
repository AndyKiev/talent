from backend.api_v1.base.base_repository import BaseRepository
from backend.api_v1.process_roles.process.process_model import Process


class ProcessRepository(BaseRepository):
    model = Process

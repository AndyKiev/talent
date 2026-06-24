from backend.api_v1.base.base_repository import BaseRepository
from backend.api_v1.audit.change_session.change_session_model import ChangeSession


class ChangeSessionRepository(BaseRepository):
    model = ChangeSession

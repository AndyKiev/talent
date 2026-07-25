from backend.api_v1.base.base_repository import BaseRepository
from backend.api_v1.msg_key.msg_key_model import MsgKey


class MsgKeyRepository(BaseRepository):
    model = MsgKey

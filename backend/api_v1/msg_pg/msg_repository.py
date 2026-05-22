from backend.api_v1.msg_pg.msg_model import Msg
from backend.api_v1.base.base_repository import BaseRepository


class MsgRepository(BaseRepository):
    model = Msg
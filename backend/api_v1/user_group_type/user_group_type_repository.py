from backend.api_v1.base.base_repository import BaseRepository
from backend.api_v1.user_group_type.user_group_type_model import UserGroupType


class UserGroupTypeRepository(BaseRepository):

    model = UserGroupType

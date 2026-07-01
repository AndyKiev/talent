from backend.api_v1.base.base_repository import BaseRepository
from backend.api_v1.user_setting.user_setting_model import UserSetting


class UserSettingRepository(BaseRepository):
    model = UserSetting

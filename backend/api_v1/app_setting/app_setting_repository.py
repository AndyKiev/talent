from backend.api_v1.base.base_repository import BaseRepository
from backend.api_v1.app_setting.app_setting_model import AppSetting


class AppSettingRepository(BaseRepository):
    model = AppSetting

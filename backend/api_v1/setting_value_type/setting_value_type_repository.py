from backend.api_v1.base.base_repository import BaseRepository
from backend.api_v1.setting_value_type.setting_value_type_model import SettingValueType


class SettingValueTypeRepository(BaseRepository):
    model = SettingValueType

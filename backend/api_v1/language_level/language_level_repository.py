from backend.api_v1.base.base_repository import BaseRepository
from backend.api_v1.language_level.language_level_model import LanguageLevel


class LanguageLevelRepository(BaseRepository):
    model = LanguageLevel

from backend.api_v1.base.base_repository import BaseRepository
from backend.api_v1.training_category.training_category_model import TrainingCategory


class TrainingCategoryRepository(BaseRepository):
    model = TrainingCategory

from backend.api_v1.base.base_repository import BaseRepository
from backend.api_v1.training_type.training_type_model import TrainingType


class TrainingTypeRepository(BaseRepository):
    model = TrainingType

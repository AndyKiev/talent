from backend.api_v1.base.base_repository import BaseRepository
from backend.api_v1.training_link_type.training_link_type_model import TrainingLinkType


class TrainingLinkTypeRepository(BaseRepository):
    model = TrainingLinkType

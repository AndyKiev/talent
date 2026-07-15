from backend.api_v1.base.base_repository import BaseRepository
from backend.api_v1.recruitment_dimension.recruitment_dimension_model import (
    RecruitmentDimension,
)


class RecruitmentDimensionRepository(BaseRepository):
    model = RecruitmentDimension

from backend.api_v1.base.base_repository import BaseRepository
from backend.api_v1.review_level_requirement.review_level_requirement_model import (
    ReviewLevelRequirement,
)


class ReviewLevelRequirementRepository(BaseRepository):
    model = ReviewLevelRequirement

from backend.api_v1.base.base_repository import BaseRepository
from backend.api_v1.job_requirement_item.job_requirement_item_model import (
    JobRequirementItem,
)


class JobRequirementItemRepository(BaseRepository):
    model = JobRequirementItem

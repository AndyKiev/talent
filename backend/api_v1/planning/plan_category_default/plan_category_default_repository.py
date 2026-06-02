from backend.api_v1.base.base_repository import BaseRepository
from backend.api_v1.planning.plan_category_default.plan_category_default_model import (
    PlanCategoryDefault,
)


class PlanCategoryDefaultRepository(BaseRepository):
    model = PlanCategoryDefault

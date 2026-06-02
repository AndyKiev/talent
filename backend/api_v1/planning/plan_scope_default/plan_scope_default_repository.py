from backend.api_v1.base.base_repository import BaseRepository
from backend.api_v1.planning.plan_scope_default.plan_scope_default_model import (
    PlanScopeDefault,
)


class PlanScopeDefaultRepository(BaseRepository):
    model = PlanScopeDefault

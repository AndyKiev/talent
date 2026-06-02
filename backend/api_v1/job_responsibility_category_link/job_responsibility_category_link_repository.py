from backend.api_v1.base.base_repository import BaseRepository
from backend.api_v1.job_responsibility_category_link.job_responsibility_category_link_model import (
    JobResponsibilityCategoryLink,
)


class JobResponsibilityCategoryLinkRepository(BaseRepository):
    model = JobResponsibilityCategoryLink

from backend.api_v1.base.base_repository import BaseRepository
from backend.api_v1.job_category.job_category_model import JobCategory


class JobCategoryRepository(BaseRepository):
    model = JobCategory

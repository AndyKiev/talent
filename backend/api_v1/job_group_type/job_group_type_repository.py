from backend.api_v1.base.base_repository import BaseRepository
from backend.api_v1.job_group_type.job_group_type_model import JobGroupType


class JobGroupTypeRepository(BaseRepository):
    model = JobGroupType

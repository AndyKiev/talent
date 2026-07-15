from backend.api_v1.base.base_repository import BaseRepository
from backend.api_v1.pipeline_status.pipeline_status_model import PipelineStatus


class PipelineStatusRepository(BaseRepository):
    model = PipelineStatus

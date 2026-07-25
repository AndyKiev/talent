
from pydantic import BaseModel, ConfigDict


class PipelineStatusSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    description: str | None = None
    sort_order: int

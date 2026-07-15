from pydantic import BaseModel, ConfigDict
from typing import Optional


class RecruitmentTaskStatusSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    description: Optional[str] = None

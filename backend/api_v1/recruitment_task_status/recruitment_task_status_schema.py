from pydantic import BaseModel, ConfigDict


class RecruitmentTaskStatusSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    description: str | None = None

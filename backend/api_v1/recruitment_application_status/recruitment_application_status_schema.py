from pydantic import BaseModel, ConfigDict


class RecruitmentApplicationStatusSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    description: str | None = None
    sort_order: int

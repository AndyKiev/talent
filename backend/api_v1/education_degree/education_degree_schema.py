
from pydantic import BaseModel, ConfigDict, Field


class EducationDegreeBase(BaseModel):
    name_key: str = Field(..., max_length=128)
    sort_order: int = 0
    is_active: bool = True


class EducationDegree(EducationDegreeBase):
    model_config = ConfigDict(from_attributes=True)
    id: int

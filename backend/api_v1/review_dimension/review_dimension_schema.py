
from pydantic import BaseModel, ConfigDict, Field


class ReviewDimensionCriteriaSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    text: str
    sort_order: int


class ReviewDimensionBase(BaseModel):
    name: str = Field(..., max_length=128)
    key: str = Field(..., max_length=64)
    description: str | None = None
    is_active: bool = True
    # No max_length here: the service validates the hex format and returns a
    # domain message for ANY bad input (over-length included).
    color: str = "#1565C0"
    sort_order: int = 0


class ReviewDimensionCreate(ReviewDimensionBase):
    pass


class ReviewDimensionUpdate(BaseModel):
    name: str | None = Field(None, max_length=128)
    key: str | None = Field(None, max_length=64)
    description: str | None = None
    is_active: bool | None = None
    color: str | None = None
    sort_order: int | None = None


class ReviewDimension(ReviewDimensionBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    criteria: list[ReviewDimensionCriteriaSchema] = []

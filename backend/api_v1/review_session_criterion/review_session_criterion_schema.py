
from pydantic import BaseModel, ConfigDict


class ReviewSessionCriterionBase(BaseModel):
    session_id: int
    dimension_id: int
    source_criteria_id: int | None = None
    text: str
    sort_order: int = 0


class ReviewSessionCriterion(ReviewSessionCriterionBase):
    model_config = ConfigDict(from_attributes=True)
    id: int


class FrozenCriterionSchema(BaseModel):
    """Slim view of a frozen criterion as carried on an evaluation payload."""

    model_config = ConfigDict(from_attributes=True)
    id: int
    text: str
    sort_order: int = 0

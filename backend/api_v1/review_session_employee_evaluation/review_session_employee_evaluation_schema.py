from pydantic import BaseModel, ConfigDict, Field
from typing import Optional

from backend.api_v1.review_session_employee_evaluation.review_session_employee_evaluation_constants import (
    MAX_GRADE,
)


class EvaluationBase(BaseModel):
    review_session_employee_id: int
    dimension_id: int


class EvaluationUpdate(BaseModel):
    score: Optional[int] = Field(None, ge=0, le=MAX_GRADE)
    facts: Optional[str] = None
    improvement: Optional[str] = None


class Evaluation(EvaluationBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    score: Optional[int] = None
    facts: Optional[str] = None
    improvement: Optional[str] = None
    dimension_name: str = ""
    dimension_key: str = ""
    dimension_description: Optional[str] = None
    dimension_is_active: bool = True


class EvaluationBulkUpdate(BaseModel):
    id: int
    score: Optional[int] = Field(None, ge=0, le=MAX_GRADE)
    facts: Optional[str] = None
    improvement: Optional[str] = None

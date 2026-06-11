from pydantic import BaseModel, ConfigDict, Field
from typing import Optional, List

from backend.api_v1.review_session_employee_evaluation.review_session_employee_evaluation_constants import (
    MAX_GRADE,
)


class CriterionScoreSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    criterion_index: int
    score: int


class CriterionScoreInput(BaseModel):
    criterion_index: int = Field(..., ge=0)
    score: int = Field(..., ge=1, le=MAX_GRADE)


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
    mean_score: Optional[float] = None
    facts: Optional[str] = None
    improvement: Optional[str] = None
    criterion_scores: List[CriterionScoreSchema] = []
    dimension_name: str = ""
    dimension_key: str = ""
    dimension_description: Optional[str] = None
    dimension_is_active: bool = True


class EvaluationBulkUpdate(BaseModel):
    id: int
    facts: Optional[str] = None
    improvement: Optional[str] = None
    # Per-descriptor (hint bullet) star ratings. When provided, the server
    # replaces the stored set and recomputes mean_score (+ legacy rounded score).
    criterion_scores: Optional[List[CriterionScoreInput]] = None

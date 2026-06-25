from pydantic import BaseModel, ConfigDict, Field
from typing import Optional, List, Literal

from backend.api_v1.review_session_employee_evaluation.review_session_employee_evaluation_constants import (
    MAX_GRADE,
)
from backend.api_v1.review_session_criterion.review_session_criterion_schema import (
    FrozenCriterionSchema,
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
    # Frozen behaviour descriptors for this evaluation's dimension, in display
    # order. Populated on the list read; `criterion_index` indexes into this.
    criteria: List[FrozenCriterionSchema] = []
    dimension_name: str = ""
    dimension_key: str = ""
    dimension_description: Optional[str] = None
    dimension_is_active: bool = True
    dimension_color: str = "#1565C0"
    dimension_sort_order: int = 0


class EvaluationBulkUpdate(BaseModel):
    id: int
    facts: Optional[str] = None
    improvement: Optional[str] = None
    # Per-descriptor (hint bullet) star ratings. When provided, the server
    # replaces the stored set and recomputes mean_score (+ legacy rounded score).
    criterion_scores: Optional[List[CriterionScoreInput]] = None


class EvaluationFlipCompetence(BaseModel):
    """A confirmed re-rating that moves a competence to the opposite summary
    list. Atomic: the single descriptor score is set, the leaving side's dim
    column is cleared, and the competence is stripped from the RSE's
    competence_summary JSON — all in one transaction (commit once, rollback on
    failure). `leaving_side` is the summary list the competence is removed from:
    "strong" clears `facts`, "develop" clears `improvement`."""

    criterion_index: int = Field(..., ge=0)
    new_score: int = Field(..., ge=1, le=MAX_GRADE)
    leaving_side: Literal["strong", "develop"]

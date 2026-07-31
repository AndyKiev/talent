from pydantic import BaseModel, ConfigDict, Field

from backend.api_v1.employee_fact.employee_fact_schema import (
    EmployeeFact as EmployeeFactSchema,
)
from backend.api_v1.review_session_criterion.review_session_criterion_schema import (
    FrozenCriterionSchema,
)
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
    """Scalars only. The two numbered lists left this schema when they became
    rows: they are identity-bearing (each line records who wrote it) and have
    their own CRUD under /employee_facts, so a full-desired-state replace here
    would delete authored rows as a side effect of an unrelated edit."""

    score: int | None = Field(None, ge=0, le=MAX_GRADE)


class Evaluation(EvaluationBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    score: int | None = None
    mean_score: float | None = None
    # The competence's two numbered lists, in display order. Rows from
    # `employee_facts` attached through `employee_fact_evaluation_links` —
    # READ-ONLY here; every write goes through /employee_facts.
    facts: list[EmployeeFactSchema] = []
    improvements: list[EmployeeFactSchema] = []
    criterion_scores: list[CriterionScoreSchema] = []
    # Frozen behaviour descriptors for this evaluation's dimension, in display
    # order. Populated on the list read; `criterion_index` indexes into this.
    criteria: list[FrozenCriterionSchema] = []
    dimension_name: str = ""
    dimension_key: str = ""
    dimension_description: str | None = None
    dimension_is_active: bool = True
    dimension_color: str = "#1565C0"
    dimension_sort_order: int = 0


class EvaluationBulkUpdate(BaseModel):
    id: int
    # Per-descriptor (hint bullet) star ratings. When provided, the server
    # replaces the stored set and recomputes mean_score (+ legacy rounded score).
    criterion_scores: list[CriterionScoreInput] | None = None


class EvaluationFlipCompetence(BaseModel):
    """A confirmed re-rating that moves a competence to the opposite summary
    list. Atomic: the single descriptor score is set, the leaving side's dim
    column is cleared, and the competence's `review_session_employee_dimensions` row is
    deleted (its comments cascade) — all in one transaction (commit once,
    rollback on failure).

    `leaving_type_id` is the review_session_employee_dimension_types row the competence is
    removed from — an id, not a literal, so the sides stay data. Its KEY still
    decides which list is cleared ('strong' clears the FACTS, 'develop' the
    IMPROVEMENTS), because that part genuinely is code. Clearing now deletes the
    `employee_facts` rows attached to this competence on that side; it used to
    NULL a text column, and the destructive semantics are kept deliberately."""

    criterion_index: int = Field(..., ge=0)
    new_score: int = Field(..., ge=1, le=MAX_GRADE)
    leaving_type_id: int

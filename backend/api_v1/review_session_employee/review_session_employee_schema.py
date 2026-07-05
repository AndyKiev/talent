from pydantic import BaseModel, ConfigDict, Field
from typing import Optional, List
from datetime import date


class EvaluationInRSE(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    dimension_id: int
    score: Optional[int] = None
    facts: Optional[str] = None
    improvement: Optional[str] = None


class ReviewSessionEmployeeBase(BaseModel):
    session_id: int
    employee_id: int


class ReviewSessionEmployeeCreate(ReviewSessionEmployeeBase):
    pass


class ReviewSessionEmployeeUpdate(BaseModel):
    status: Optional[str] = None


class ReviewSessionEmployeeFieldsUpdate(BaseModel):
    """Employee-filled free-text fields for a review (feedback + results)."""

    employee_feedback: Optional[str] = None
    manager_feedback: Optional[str] = None
    results_achievements: Optional[str] = None
    development_plan: Optional[str] = None
    trainings: Optional[str] = None
    competence_summary: Optional[str] = None


class ReviewSessionEmployee(ReviewSessionEmployeeBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    status: str
    employee_name: str = ""
    employee_code: str = ""
    session_name: str = ""
    session_status: str = "open"
    # Employee-header facts, folded in here so the people-review page never has
    # to hit the admin-guarded GET /employees/{id}. Populated in _to_schema from
    # the (people-review-scoped) reviewee employee record.
    current_level_id: Optional[int] = None
    birth_date: Optional[date] = None
    hire_date: Optional[date] = None
    job_assigned_date: Optional[date] = None
    sex: Optional[str] = None
    marital_status: Optional[str] = None
    job_name: Optional[str] = None
    main_department_name: Optional[str] = None
    employee_feedback: Optional[str] = None
    manager_feedback: Optional[str] = None
    results_achievements: Optional[str] = None
    development_plan: Optional[str] = None
    trainings: Optional[str] = None
    competence_summary: Optional[str] = None
    evaluations: List[EvaluationInRSE] = []


class ReviewSessionEmployeeList(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    session_id: int
    employee_id: int
    status: str
    employee_name: str = ""
    employee_code: str = ""
    scored_count: int = 0
    facts_count: int = 0
    total_dimensions: int = 0
    queue_position: Optional[int] = None


class ReviewSessionEmployeeReorder(BaseModel):
    """Bulk presentation-queue reorder: the RSE ids in their new top-to-bottom
    presentation order. Positions are reassigned server-side as 10, 20, 30 …"""

    session_id: int
    ordered_ids: List[int]

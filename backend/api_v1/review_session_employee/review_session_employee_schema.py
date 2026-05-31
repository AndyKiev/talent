from pydantic import BaseModel, ConfigDict, Field
from typing import Optional, List


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


class ReviewSessionEmployee(ReviewSessionEmployeeBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    status: str
    employee_name: str = ""
    employee_code: str = ""
    session_name: str = ""
    session_status: str = "open"
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
    total_dimensions: int = 0

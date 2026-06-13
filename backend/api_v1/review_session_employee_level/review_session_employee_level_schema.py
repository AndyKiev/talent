from pydantic import BaseModel, ConfigDict
from typing import Optional, List, Literal

ProposedLevelStatus = Literal["proposed", "validated", "rejected"]


class LevelAnswerSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    requirement_id: int
    facts: Optional[str] = None


class ProposedLevelSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    review_session_employee_id: int
    level_id: int
    status: ProposedLevelStatus = "proposed"
    answers: List[LevelAnswerSchema] = []


class ProposedLevelStatusUpdate(BaseModel):
    status: ProposedLevelStatus


class LevelAnswerInput(BaseModel):
    requirement_id: int
    facts: Optional[str] = None


class ProposedLevelUpsert(BaseModel):
    level_id: int
    answers: List[LevelAnswerInput] = []

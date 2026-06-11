from pydantic import BaseModel, ConfigDict
from typing import Optional, List


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
    answers: List[LevelAnswerSchema] = []


class LevelAnswerInput(BaseModel):
    requirement_id: int
    facts: Optional[str] = None


class ProposedLevelUpsert(BaseModel):
    level_id: int
    answers: List[LevelAnswerInput] = []

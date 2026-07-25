from typing import Literal

from pydantic import BaseModel, ConfigDict

ProposedLevelStatus = Literal["proposed", "validated", "rejected"]


class LevelAnswerSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    requirement_id: int
    facts: str | None = None


class ProposedLevelSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    review_session_employee_id: int
    level_id: int
    status: ProposedLevelStatus = "proposed"
    answers: list[LevelAnswerSchema] = []


class ProposedLevelStatusUpdate(BaseModel):
    status: ProposedLevelStatus


class LevelAnswerInput(BaseModel):
    requirement_id: int
    facts: str | None = None


class ProposedLevelUpsert(BaseModel):
    level_id: int
    answers: list[LevelAnswerInput] = []

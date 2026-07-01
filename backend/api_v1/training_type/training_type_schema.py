from pydantic import BaseModel, ConfigDict, Field
from typing import Optional
from datetime import datetime


class TrainingTypeBase(BaseModel):
    name: str = Field(..., max_length=128)
    key: str = Field(..., max_length=64)
    description: Optional[str] = Field(None, max_length=256)
    training_category_id: int
    training_link_type_id: int
    job_category_ids: list[int] = Field(default_factory=list)
    job_ids: list[int] = Field(default_factory=list)


class TrainingTypeCreate(TrainingTypeBase):
    pass


class TrainingTypeUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=128)
    key: Optional[str] = Field(None, max_length=64)
    description: Optional[str] = Field(None, max_length=256)
    training_category_id: Optional[int] = None
    training_link_type_id: Optional[int] = None
    job_category_ids: Optional[list[int]] = None
    job_ids: Optional[list[int]] = None


class TrainingType(TrainingTypeBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: datetime
    training_category_name: Optional[str] = None
    training_link_type_key: Optional[str] = None
    job_category_keys: list[str] = Field(default_factory=list)
    job_names: list[str] = Field(default_factory=list)

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class TrainingTypeBase(BaseModel):
    name: str = Field(..., max_length=128)
    key: str = Field(..., max_length=64)
    description: str | None = Field(None, max_length=256)
    training_category_id: int
    training_link_type_id: int
    job_category_ids: list[int] = Field(default_factory=list)
    job_ids: list[int] = Field(default_factory=list)


class TrainingTypeCreate(TrainingTypeBase):
    pass


class TrainingTypeUpdate(BaseModel):
    name: str | None = Field(None, max_length=128)
    key: str | None = Field(None, max_length=64)
    description: str | None = Field(None, max_length=256)
    training_category_id: int | None = None
    training_link_type_id: int | None = None
    job_category_ids: list[int] | None = None
    job_ids: list[int] | None = None


class TrainingType(TrainingTypeBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: datetime
    training_category_name: str | None = None
    training_link_type_key: str | None = None
    job_category_keys: list[str] = Field(default_factory=list)
    job_names: list[str] = Field(default_factory=list)

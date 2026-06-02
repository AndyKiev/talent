from pydantic import BaseModel, ConfigDict, Field
from typing import Optional, List
from datetime import datetime


class JobGroupTypeBase(BaseModel):
    name: str = Field(..., max_length=128)
    key: str = Field(..., max_length=32)
    description: Optional[str] = Field(None, max_length=256)
    allow_multiple: bool = Field(
        True,
        description=(
            "When False, a job may belong to at most one group of this type. "
            "Adding a second group raises JobGroupTypeSingletonViolation."
        ),
    )


class JobGroupTypeCreate(JobGroupTypeBase):
    pass


class JobGroupTypeUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=128)
    key: Optional[str] = Field(None, max_length=32)
    description: Optional[str] = Field(None, max_length=256)
    allow_multiple: Optional[bool] = None


class JobGroupType(JobGroupTypeBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: datetime
    groups: List[str] = []  # Names of JobGroups linked to this type

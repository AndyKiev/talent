from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class JobGroupTypeBase(BaseModel):
    name: str = Field(..., max_length=128)
    key: str = Field(..., max_length=32)
    description: str | None = Field(None, max_length=256)
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
    name: str | None = Field(None, max_length=128)
    key: str | None = Field(None, max_length=32)
    description: str | None = Field(None, max_length=256)
    allow_multiple: bool | None = None


class JobGroupType(JobGroupTypeBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: datetime
    groups: list[str] = []  # Names of JobGroups linked to this type

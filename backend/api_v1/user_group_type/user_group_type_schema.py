from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class UserGroupTypeBase(BaseModel):
    name: str = Field(..., max_length=128)
    description: str | None = Field(None, max_length=256)


class UserGroupTypeCreate(UserGroupTypeBase):
    pass


class UserGroupTypeUpdate(BaseModel):
    name: str | None = Field(None, max_length=128)
    description: str | None = Field(None, max_length=256)


class UserGroupType(UserGroupTypeBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: datetime
    groups: list[str] = []  # Names of UserGroups linked to this type

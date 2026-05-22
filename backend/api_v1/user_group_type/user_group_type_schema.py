from pydantic import BaseModel, ConfigDict, Field
from typing import Optional, List
from datetime import datetime


class UserGroupTypeBase(BaseModel):
    name: str = Field(..., max_length=128)
    description: Optional[str] = Field(None, max_length=256)


class UserGroupTypeCreate(UserGroupTypeBase):
    pass


class UserGroupTypeUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=128)
    description: Optional[str] = Field(None, max_length=256)


class UserGroupType(UserGroupTypeBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: datetime
    groups: List[str] = []  # Names of UserGroups linked to this type

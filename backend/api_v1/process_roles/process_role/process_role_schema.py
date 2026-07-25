from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class ProcessRoleBase(BaseModel):
    process_id: int
    name: str = Field(..., max_length=128)
    short_name: str | None = Field(None, max_length=32)
    key: str | None = Field(None, max_length=64)
    is_active: bool = True
    link_target: Literal["employee", "department"] = "employee"


class ProcessRoleCreate(ProcessRoleBase):
    pass


class ProcessRoleUpdate(BaseModel):
    name: str | None = Field(None, max_length=128)
    short_name: str | None = Field(None, max_length=32)
    key: str | None = Field(None, max_length=64)
    is_active: bool | None = None
    link_target: Literal["employee", "department"] | None = None


class ProcessRole(ProcessRoleBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: datetime
    process_name: str | None = None

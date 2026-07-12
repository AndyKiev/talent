from pydantic import BaseModel, ConfigDict, Field
from typing import Optional, Literal
from datetime import datetime


class ProcessRoleBase(BaseModel):
    process_id: int
    name: str = Field(..., max_length=128)
    short_name: Optional[str] = Field(None, max_length=32)
    key: Optional[str] = Field(None, max_length=64)
    is_active: bool = True
    link_target: Literal["employee", "department"] = "employee"


class ProcessRoleCreate(ProcessRoleBase):
    pass


class ProcessRoleUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=128)
    short_name: Optional[str] = Field(None, max_length=32)
    key: Optional[str] = Field(None, max_length=64)
    is_active: Optional[bool] = None
    link_target: Optional[Literal["employee", "department"]] = None


class ProcessRole(ProcessRoleBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: datetime
    process_name: Optional[str] = None

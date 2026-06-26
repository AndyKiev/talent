from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional


class JobProcessRoleLinkCreate(BaseModel):
    job_id: int
    process_role_id: int


class JobProcessRoleLink(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    job_id: int
    process_role_id: int
    created_at: datetime
    # Denormalised for display convenience
    job_name: Optional[str] = None
    process_name: Optional[str] = None
    role_name: Optional[str] = None

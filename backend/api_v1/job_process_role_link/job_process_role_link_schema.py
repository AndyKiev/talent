from pydantic import BaseModel, ConfigDict, Field
from datetime import datetime
from typing import List, Optional


class JobProcessRoleLinkCreate(BaseModel):
    job_id: int
    process_role_id: int
    # Oversight targets: dept types whose EMPLOYEES this job+role oversees
    department_type_ids: List[int] = Field(default_factory=list)


class SetLinkDepartmentTypes(BaseModel):
    department_type_ids: List[int] = Field(default_factory=list)


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
    # Oversight targets (see JobProcessRoleLinkDepartmentType)
    department_type_ids: List[int] = Field(default_factory=list)
    department_type_names: List[str] = Field(default_factory=list)

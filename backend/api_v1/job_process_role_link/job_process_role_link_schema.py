from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class JobProcessRoleLinkCreate(BaseModel):
    job_id: int
    process_role_id: int
    # Oversight targets: dept types whose EMPLOYEES this job+role oversees
    department_type_ids: list[int] = Field(default_factory=list)


class SetLinkDepartmentTypes(BaseModel):
    department_type_ids: list[int] = Field(default_factory=list)


class JobProcessRoleLink(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    job_id: int
    process_role_id: int
    created_at: datetime
    # Denormalised for display convenience
    job_name: str | None = None
    process_name: str | None = None
    role_name: str | None = None
    # Oversight targets (see JobProcessRoleLinkDepartmentType)
    department_type_ids: list[int] = Field(default_factory=list)
    department_type_names: list[str] = Field(default_factory=list)

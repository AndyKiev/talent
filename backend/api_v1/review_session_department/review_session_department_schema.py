from pydantic import BaseModel, ConfigDict, Field
from typing import Optional
from datetime import datetime


class ReviewSessionDepartmentBase(BaseModel):
    session_id: int
    department_id: int


class ReviewSessionDepartmentCreate(BaseModel):
    department_id: int


class ReviewSessionDepartment(ReviewSessionDepartmentBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: datetime
    department_name: Optional[str] = None

    @classmethod
    def from_orm_with_name(cls, record) -> "ReviewSessionDepartment":
        """Build schema from ORM record, pulling department name from the relationship."""
        obj = cls.model_validate(record)
        if record.department:
            obj.department_name = record.department.name
        return obj

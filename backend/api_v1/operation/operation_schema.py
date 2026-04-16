# backend/api_v1/schemas/operation_schema.py
from typing import Optional, List
from pydantic import BaseModel, Field, ConfigDict


class OperationBase(BaseModel):
    name: str = Field(..., max_length=100)
    description: Optional[str] = Field(None, max_length=500)


class OperationCreate(OperationBase):
    pass


class OperationUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=100)
    description: Optional[str] = Field(None, max_length=500)


class Operation(OperationBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    user_groups: List[str] = []

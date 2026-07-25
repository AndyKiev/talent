# backend/api_v1/schemas/operation_schema.py

from pydantic import BaseModel, ConfigDict, Field


class OperationBase(BaseModel):
    name: str = Field(..., max_length=100)
    description: str | None = Field(None, max_length=500)


class OperationCreate(OperationBase):
    pass


class OperationUpdate(BaseModel):
    name: str | None = Field(None, max_length=100)
    description: str | None = Field(None, max_length=500)


class Operation(OperationBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    user_groups: list[str] = []

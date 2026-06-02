# backend/api_v1/essence_set/essence_set_schema.py
from typing import List
from pydantic import BaseModel, ConfigDict, Field


class EssenceSetSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    fingerprint: str
    essence_ids: List[int] = []
    essence_names: List[str] = []


class OperationEssenceSetLinkSchema(BaseModel):
    """Read schema for a set-grain permission row."""
    model_config = ConfigDict(from_attributes=True)
    id: int
    operation_id: int
    operation_name: str
    essence_set_id: int
    fingerprint: str
    essence_names: List[str] = []
    # Names of user groups that hold this permission (for the admin grid)
    user_group_names: List[str] = []


class OperationEssenceSetLinkCreate(BaseModel):
    """
    Create a set-grain permission.

    `essence_ids` is the *set* of essences the operation applies to.
    A single-element list is the degenerate single-essence case.
    """
    operation_id: int
    essence_ids: List[int] = Field(..., min_length=1)

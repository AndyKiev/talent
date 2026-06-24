from typing import Optional, Dict, List
from pydantic import BaseModel, Field, ConfigDict


class UserGroupBase(BaseModel):
    name: str = Field(..., min_length=3, max_length=128)
    description: Optional[str] = Field(None, max_length=256)
    is_protected: bool = Field(False)
    user_group_type_id: int


class UserGroupCreate(UserGroupBase):
    pass


class UserGroupUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=128)
    description: Optional[str] = Field(None, max_length=256)
    is_protected: Optional[bool] = Field(None)
    user_group_type_id: Optional[int] = Field(None)


class UserGroup(UserGroupBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    users_qty: Optional[Dict[str, int]] = None
    # Exposed via ORM properties — populated automatically by model_validate
    user_group_type_name: Optional[str] = None
    oel_ids: List[int] = []  # legacy single-essence grants
    oesl_ids: List[int] = []  # set-grain grants

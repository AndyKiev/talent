
from pydantic import BaseModel, ConfigDict, Field


class UserGroupBase(BaseModel):
    name: str = Field(..., min_length=3, max_length=128)
    description: str | None = Field(None, max_length=256)
    is_protected: bool = Field(False)
    user_group_type_id: int


class UserGroupCreate(UserGroupBase):
    pass


class UserGroupUpdate(BaseModel):
    name: str | None = Field(None, max_length=128)
    description: str | None = Field(None, max_length=256)
    is_protected: bool | None = Field(None)
    user_group_type_id: int | None = Field(None)


class UserGroup(UserGroupBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    users_qty: dict[str, int] | None = None
    # Exposed via ORM properties — populated automatically by model_validate
    user_group_type_name: str | None = None
    oel_ids: list[int] = []  # legacy single-essence grants
    oesl_ids: list[int] = []  # set-grain grants

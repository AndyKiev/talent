from pydantic import BaseModel, ConfigDict, Field
from typing import Optional, List
from datetime import datetime
from backend.api_v1.lang.lang_schema import LangRead

class UserBase(BaseModel):
    code: str = Field(..., max_length=10)
    name: str = Field(..., max_length=100)
    email: Optional[str] = Field(None, max_length=100)
    is_active: bool = True
    # job_id: int = Field(default=1)
    lang_id: int = Field(default=3)


class UserCreate(UserBase):
    pass


class UserUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=100)
    email: Optional[str] = Field(None, max_length=100)
    is_active: Optional[bool] = None
    # job_id: Optional[int] = None
    lang_id: Optional[int] = None


class User(UserBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    # groups: List[str] = []  # populated via User.groups @property
    operations: List[str] = []  # populated by UserService (async repo query)
    # job: Optional["Job"] = None
    lang: Optional["LangRead"] = None


class UserAuth(BaseModel):
    username: str
    email: Optional[str] = None
    is_active: bool = True



User.model_rebuild()

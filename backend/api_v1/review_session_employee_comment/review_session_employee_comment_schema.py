from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class ReviewCommentCreate(BaseModel):
    body: str = Field(min_length=1)
    # 'private' (default) | 'public'. Validated server-side.
    visibility: str = "private"


class ReviewCommentUpdate(BaseModel):
    """Owner-only edit: change the text and/or flip the visibility scope."""

    body: Optional[str] = None
    visibility: Optional[str] = None


class ReviewCommentSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    review_session_employee_id: int
    author_id: int
    author_name: str = ""
    # 'oversight' | 'supervision' — the role the note was written under.
    author_role: str
    # 'private' | 'public'.
    visibility: str
    body: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

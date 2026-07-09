from pydantic import BaseModel, Field
from typing import List


class AccessTestGroupOption(BaseModel):
    """One selectable authorisation group for the test-as picker."""

    id: int
    name: str


class AccessTestState(BaseModel):
    """Current test-as state for the requesting user + the groups they may pick."""

    active: bool = False
    group_ids: List[int] = []
    group_names: List[str] = []
    available_groups: List[AccessTestGroupOption] = []


class AccessTestContextSet(BaseModel):
    """PUT body — enter/update test-as mode for the current user."""

    group_ids: List[int] = Field(..., min_length=1)

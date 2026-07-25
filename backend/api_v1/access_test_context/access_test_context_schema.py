
from pydantic import BaseModel, Field


class AccessTestGroupOption(BaseModel):
    """One selectable authorisation group for the test-as picker."""

    id: int
    name: str


class AccessTestState(BaseModel):
    """Current test-as state for the requesting user + the groups they may pick."""

    active: bool = False
    group_ids: list[int] = []
    group_names: list[str] = []
    available_groups: list[AccessTestGroupOption] = []


class AccessTestContextSet(BaseModel):
    """PUT body — enter/update test-as mode for the current user."""

    group_ids: list[int] = Field(..., min_length=1)

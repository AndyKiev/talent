
from pydantic import BaseModel


class SessionLevelRequirementSchema(BaseModel):
    """A frozen requirement exposed in the LIVE-id shape the frontend expects:
    `id` is the source (live) requirement id so existing answer matching/saving
    (which uses live ids) keeps working unchanged."""

    id: int
    text_key: str
    sort_order: int
    is_active: bool = True


class SessionLevelSchema(BaseModel):
    """A frozen level in the LIVE-id shape (`id` = source live level id), with its
    frozen requirements. Mirrors the frontend `ReviewLevelLite`."""

    id: int
    name_key: str
    description_key: str | None = None
    sort_order: int
    is_active: bool = True
    requirements: list[SessionLevelRequirementSchema] = []

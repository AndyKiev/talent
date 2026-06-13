from pydantic import BaseModel, ConfigDict


class EmployeePhotoMeta(BaseModel):
    """Lightweight descriptor of a stored photo (never includes the bytes)."""

    model_config = ConfigDict(from_attributes=True)
    employee_id: int
    content_type: str
    size: int

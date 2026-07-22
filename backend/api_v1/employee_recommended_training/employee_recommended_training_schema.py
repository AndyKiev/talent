from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field


class RecommendedTrainingStatusSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    key: str
    description: str = ""
    sort_order: int = 0


class EmployeeRecommendedTraining(BaseModel):
    """One recommended training, with its status resolved for display."""

    model_config = ConfigDict(from_attributes=True)
    id: int
    employee_id: int
    employee_recommended_training_status_id: int
    status_key: str = ""
    status_description: str = ""
    description: str
    is_active: bool = True
    sort_order: int = 0
    created_at: datetime


class EmployeeRecommendedTrainingCreate(BaseModel):
    """`employee_recommended_training_status_id` is optional: omitted, the
    service applies the seeded 'recommended' default, which is what every new
    recommendation starts as."""

    description: str = Field(..., min_length=1)
    employee_recommended_training_status_id: Optional[int] = None


class EmployeeRecommendedTrainingUpdate(BaseModel):
    """Partial update — every field is separately optional so the status pill,
    the is_active toggle and the text can each be saved on their own."""

    description: Optional[str] = Field(None, min_length=1)
    employee_recommended_training_status_id: Optional[int] = None
    is_active: Optional[bool] = None


class EmployeeRecommendedTrainingReorder(BaseModel):
    """Recommendation ids in their new top-to-bottom order."""

    ordered_ids: List[int] = []


class EmployeeRecommendedTrainingPermissions(BaseModel):
    """UI affordances only — the server re-derives all of it on every write."""

    can_write: bool = False
    can_delete: bool = False


class EmployeeRecommendedTrainingList(BaseModel):
    """The employee's list plus what the caller may do with it, so the frontend
    does not have to guess at the permission rules."""

    items: List[EmployeeRecommendedTraining] = []
    permissions: EmployeeRecommendedTrainingPermissions = (
        EmployeeRecommendedTrainingPermissions()
    )

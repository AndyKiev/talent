from pydantic import BaseModel, ConfigDict, Field, computed_field
from typing import Optional
from datetime import datetime

from backend.api_v1.talent_status.talent_status_schema import (
    TalentStatus as TalentStatusSchema,
)
from backend.api_v1.talent_period.talent_period_schema import (
    TalentPeriod as TalentPeriodSchema,
)


class TalentStatusPeriodLinkBase(BaseModel):
    talent_period_id: int
    talent_status_id: int
    is_active: bool = True


class TalentStatusPeriodLinkCreate(TalentStatusPeriodLinkBase):
    pass


class TalentStatusPeriodLinkUpdate(BaseModel):
    is_active: Optional[bool] = None


class TalentStatusPeriodLink(TalentStatusPeriodLinkBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_by: Optional[int] = None
    created_at: datetime
    talent_period: Optional[TalentPeriodSchema] = None
    talent_status: Optional[TalentStatusSchema] = None


class TalentStatusPeriodLinkWithLabel(TalentStatusPeriodLink):
    """
    Extends the base link schema with a human-readable label that combines
    both the status key and the period name, e.g. "PO - 24" or "PA - 36".
    Used by the employee form talent-tab select.
    """

    @computed_field
    @property
    def label(self) -> str:
        status_key = (
            self.talent_status.key if self.talent_status else str(self.talent_status_id)
        )
        period_name = (
            self.talent_period.name
            if self.talent_period
            else str(self.talent_period_id)
        )
        return f"{status_key} - {period_name}"

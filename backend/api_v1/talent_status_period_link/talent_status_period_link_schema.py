from datetime import datetime

from pydantic import BaseModel, ConfigDict, computed_field

from backend.api_v1.talent_period.talent_period_schema import (
    TalentPeriod as TalentPeriodSchema,
)
from backend.api_v1.talent_status.talent_status_schema import (
    TalentStatus as TalentStatusSchema,
)


class TalentStatusPeriodLinkBase(BaseModel):
    talent_period_id: int
    talent_status_id: int
    is_active: bool = True


class TalentStatusPeriodLinkCreate(TalentStatusPeriodLinkBase):
    pass


class TalentStatusPeriodLinkUpdate(BaseModel):
    is_active: bool | None = None


class TalentStatusPeriodLink(TalentStatusPeriodLinkBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_by: int | None = None
    created_at: datetime
    talent_period: TalentPeriodSchema | None = None
    talent_status: TalentStatusSchema | None = None


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

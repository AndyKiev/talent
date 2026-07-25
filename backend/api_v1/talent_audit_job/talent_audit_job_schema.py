import datetime

from pydantic import BaseModel, ConfigDict


class TalentAuditJobBase(BaseModel):
    talent_audit_id: int
    target_job_id: int
    status_id: int
    talent_status_period_link_id: int


class TalentAuditJobCreate(TalentAuditJobBase):
    # created_by injected from the authenticated user in the service
    pass


class TalentAuditJobUpdate(BaseModel):
    status_id: int


class TalentAuditJob(TalentAuditJobBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_by: int
    created_at: datetime.datetime

    # Enriched fields — populated from ORM relationships via from_attributes
    job_name: str | None = None
    status_name: str | None = None
    hrm_status_period_label: str | None = None


class TalentAuditJobEnriched(TalentAuditJob):
    """
    Extended schema with enriched names resolved from ORM relationships.
    Used by the views layer — the service populates these before returning.
    """


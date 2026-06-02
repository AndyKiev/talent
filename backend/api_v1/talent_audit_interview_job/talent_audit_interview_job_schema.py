import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, model_validator


class TalentAuditInterviewJobBase(BaseModel):
    talent_audit_interview_id: int
    talent_audit_job_id: int
    talent_status_period_link_id: int


class TalentAuditInterviewJobCreate(BaseModel):
    """Used inside the interview creation payload — interview_id not yet known."""
    talent_audit_job_id: int
    talent_status_period_link_id: int


class TalentAuditInterviewJob(TalentAuditInterviewJobBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_by: int
    created_at: datetime.datetime

    # Enriched fields resolved from ORM relationships
    job_name: Optional[str] = None
    hrm_status_period_label: Optional[str] = None
    hrs_status_period_label: Optional[str] = None

    @model_validator(mode="before")
    @classmethod
    def _resolve_labels(cls, data):
        """
        When constructed via from_attributes (ORM object), resolve nested
        relationship data into flat label strings.
        """
        # If data is a dict (already serialized), skip
        if isinstance(data, dict):
            return data

        obj = data  # ORM instance

        # HRS label — from this record's talent_status_period_link
        link = getattr(obj, "talent_status_period_link", None)
        if link:
            status = getattr(link, "talent_status", None)
            period = getattr(link, "talent_period", None)
            if status and period:
                # Set on the ORM object so from_attributes picks it up
                object.__setattr__(obj, "hrs_status_period_label",
                                   f"{status.key} - {period.name}")

        # Job name + HRM label — from talent_audit_job relationship
        audit_job = getattr(obj, "talent_audit_job", None)
        if audit_job:
            target_job = getattr(audit_job, "target_job", None)
            if target_job:
                object.__setattr__(obj, "job_name", target_job.name)

            hrm_link = getattr(audit_job, "talent_status_period_link", None)
            if hrm_link:
                hrm_status = getattr(hrm_link, "talent_status", None)
                hrm_period = getattr(hrm_link, "talent_period", None)
                if hrm_status and hrm_period:
                    object.__setattr__(obj, "hrm_status_period_label",
                                       f"{hrm_status.key} - {hrm_period.name}")

        return obj
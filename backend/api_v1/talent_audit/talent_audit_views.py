from typing import Annotated

from fastapi import APIRouter, Depends, Query, status
from fastapi.security import HTTPBearer

from backend.api_v1.base.mutation_response import MutationResponse
from backend.api_v1.talent_audit.talent_audit_dependencies import (
    get_talent_audit_service,
    talent_audit_by_id,
)
from backend.api_v1.talent_audit.talent_audit_schema import (
    TalentAudit as TalentAuditSchema,
)
from backend.api_v1.talent_audit.talent_audit_schema import (
    TalentAuditCreate,
    TalentAuditUpdate,
    TalentRosterOptions,
    TalentRosterPage,
)
from backend.api_v1.talent_audit.talent_audit_service import TalentAuditService
from backend.auth.guards import Guard
from backend.utils.enums import EssenceName, OperationVerb

router = APIRouter(
    prefix="/talent_audits",
    tags=["Talent Audits"],
    dependencies=[Depends(HTTPBearer(auto_error=False))],
)


@router.get(
    "",
    response_model=list[TalentAuditSchema],
    dependencies=[Guard(OperationVerb.VIEW, EssenceName.TALENT_AUDIT)],
)
async def get_talent_audits(
    service: Annotated[TalentAuditService, Depends(get_talent_audit_service)],
    sort: str | None = Query(
        None,
        description='JSON for sorting: {"field": "asc|desc"} or [{"field1": "asc"}, "field2"]',
    ),
):
    return await service.get_talent_audits(sort=sort)


# Static paths before /{talent_audit_id}.
@router.get(
    "/roster",
    response_model=TalentRosterPage,
    dependencies=[Guard(OperationVerb.VIEW, EssenceName.TALENT_AUDIT)],
)
async def get_talent_roster(
    service: Annotated[TalentAuditService, Depends(get_talent_audit_service)],
    page: int = Query(0, ge=0),
    page_size: int = Query(25, ge=1, le=500),
    department_id: int | None = None,
    subdepartment_id: int | None = None,
    job_id: int | None = None,
    status_id: int | None = None,
    employee_id: int | None = None,
    q: str | None = None,
    has_talent: bool | None = Query(
        None, description="true = with talents, false = without, omit = all"
    ),
    talent_status_id: int | None = None,
    talent_period_id: int | None = None,
    sort_field: str = "name",
    sort_desc: bool = False,
):
    """Talent employees list: one row per visible employee with all talents."""
    return await service.get_roster(
        page=page,
        page_size=page_size,
        department_id=department_id,
        subdepartment_id=subdepartment_id,
        job_id=job_id,
        status_id=status_id,
        employee_id=employee_id,
        q=q,
        has_talent=has_talent,
        talent_status_id=talent_status_id,
        talent_period_id=talent_period_id,
        sort_field=sort_field,
        sort_desc=sort_desc,
    )


@router.get(
    "/roster_options",
    response_model=TalentRosterOptions,
    dependencies=[Guard(OperationVerb.VIEW, EssenceName.TALENT_AUDIT)],
)
async def get_talent_roster_options(
    service: Annotated[TalentAuditService, Depends(get_talent_audit_service)],
    department_id: int | None = None,
):
    """Filter options (employees / departments / jobs / statuses) in scope."""
    return await service.get_roster_options(department_id)


@router.get(
    "/{talent_audit_id}",
    response_model=TalentAuditSchema,
    dependencies=[Guard(OperationVerb.VIEW, EssenceName.TALENT_AUDIT)],
)
async def get_talent_audit(
    record: TalentAuditSchema = Depends(talent_audit_by_id),
):
    return record


@router.get(
    "/by_employee/{employee_id}",
    response_model=TalentAuditSchema,
    dependencies=[Guard(OperationVerb.VIEW, EssenceName.TALENT_AUDIT)],
)
async def get_talent_audit_by_employee(
    employee_id: int,
    service: Annotated[TalentAuditService, Depends(get_talent_audit_service)],
):
    return await service.get_by_employee_id(employee_id)


@router.post(
    "",
    response_model=MutationResponse[TalentAuditSchema],
    status_code=status.HTTP_201_CREATED,
    dependencies=[Guard(OperationVerb.CREATE, EssenceName.TALENT_AUDIT)],
)
async def create_talent_audit(
    audit_in: TalentAuditCreate,
    service: Annotated[TalentAuditService, Depends(get_talent_audit_service)],
):
    return await service.create_talent_audit(audit_in)


@router.patch(
    "/{talent_audit_id}",
    response_model=MutationResponse[TalentAuditSchema],
    dependencies=[Guard(OperationVerb.MODIFY, EssenceName.TALENT_AUDIT)],
)
async def update_talent_audit(
    audit_update: TalentAuditUpdate,
    record: TalentAuditSchema = Depends(talent_audit_by_id),
    service: Annotated[TalentAuditService, Depends(get_talent_audit_service)] = None,
):
    return await service.update_talent_audit(record.id, audit_update)


@router.delete(
    "/{talent_audit_id}",
    status_code=status.HTTP_200_OK,
    dependencies=[Guard(OperationVerb.DELETE, EssenceName.TALENT_AUDIT)],
)
async def delete_talent_audit(
    talent_audit_id: int,
    service: Annotated[TalentAuditService, Depends(get_talent_audit_service)],
):
    await service.delete_talent_audit(talent_audit_id)

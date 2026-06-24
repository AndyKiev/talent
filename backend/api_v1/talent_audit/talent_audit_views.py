from typing import Annotated, List, Optional

from fastapi import APIRouter, Depends, Query, status
from fastapi.security import HTTPBearer

from backend.api_v1.base.mutation_response import MutationResponse
from backend.api_v1.talent_audit.talent_audit_dependencies import (
    get_talent_audit_service,
    talent_audit_by_id,
)
from backend.api_v1.talent_audit.talent_audit_schema import (
    TalentAudit as TalentAuditSchema,
    TalentAuditCreate,
    TalentAuditUpdate,
)
from backend.api_v1.talent_audit.talent_audit_service import TalentAuditService
from backend.auth.guards import Guard
from backend.utils.enums import OperationVerb, EssenceName

router = APIRouter(
    prefix="/talent_audits",
    tags=["Talent Audits"],
    dependencies=[Depends(HTTPBearer(auto_error=False))],
)


@router.get(
    "",
    response_model=List[TalentAuditSchema],
    dependencies=[Guard(OperationVerb.VIEW, EssenceName.TALENT_AUDIT)],
)
async def get_talent_audits(
    service: Annotated[TalentAuditService, Depends(get_talent_audit_service)],
    sort: Optional[str] = Query(
        None,
        description='JSON for sorting: {"field": "asc|desc"} or [{"field1": "asc"}, "field2"]',
    ),
):
    return await service.get_talent_audits(sort=sort)


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

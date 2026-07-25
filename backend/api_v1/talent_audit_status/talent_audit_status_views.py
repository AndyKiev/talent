from typing import Annotated

from fastapi import APIRouter, Depends, Query, status
from fastapi.security import HTTPBearer

from backend.api_v1.base.mutation_response import MutationResponse
from backend.api_v1.talent_audit_status.talent_audit_status_dependencies import (
    get_talent_audit_status_service,
    talent_audit_status_by_id,
)
from backend.api_v1.talent_audit_status.talent_audit_status_schema import (
    TalentAuditStatus as TalentAuditStatusSchema,
)
from backend.api_v1.talent_audit_status.talent_audit_status_schema import (
    TalentAuditStatusCreate,
    TalentAuditStatusUpdate,
)
from backend.api_v1.talent_audit_status.talent_audit_status_service import (
    TalentAuditStatusService,
)
from backend.auth.guards import Guard
from backend.utils.enums import EssenceName, OperationVerb

router = APIRouter(
    prefix="/talent_audit_statuses",
    tags=["Talent Audit Statuses"],
    dependencies=[Depends(HTTPBearer(auto_error=False))],
)


@router.get(
    "",
    response_model=list[TalentAuditStatusSchema],
    dependencies=[Guard(OperationVerb.VIEW, EssenceName.TALENT_AUDIT_STATUS)],
)
async def get_talent_audit_statuses(
    service: Annotated[
        TalentAuditStatusService, Depends(get_talent_audit_status_service)
    ],
    name: str | None = None,
    sort: str | None = Query(
        None,
        description='JSON for sorting: {"field": "asc|desc"} or [{"field1": "asc"}, "field2"]',
    ),
):
    return await service.get_talent_audit_statuses(name=name, sort=sort)


@router.get(
    "/{talent_audit_status_id}",
    response_model=TalentAuditStatusSchema,
    dependencies=[Guard(OperationVerb.VIEW, EssenceName.TALENT_AUDIT_STATUS)],
)
async def get_talent_audit_status(
    record: TalentAuditStatusSchema = Depends(talent_audit_status_by_id),
):
    return record


@router.post(
    "",
    response_model=MutationResponse[TalentAuditStatusSchema],
    status_code=status.HTTP_201_CREATED,
    dependencies=[Guard(OperationVerb.CREATE, EssenceName.TALENT_AUDIT_STATUS)],
)
async def create_talent_audit_status(
    status_in: TalentAuditStatusCreate,
    service: Annotated[
        TalentAuditStatusService, Depends(get_talent_audit_status_service)
    ],
):
    return await service.create_talent_audit_status(status_in)


@router.patch(
    "/{talent_audit_status_id}",
    response_model=MutationResponse[TalentAuditStatusSchema],
    dependencies=[Guard(OperationVerb.MODIFY, EssenceName.TALENT_AUDIT_STATUS)],
)
async def update_talent_audit_status(
    status_update: TalentAuditStatusUpdate,
    record: TalentAuditStatusSchema = Depends(talent_audit_status_by_id),
    service: Annotated[
        TalentAuditStatusService, Depends(get_talent_audit_status_service)
    ] = None,
):
    return await service.update_talent_audit_status(record.id, status_update)


@router.delete(
    "/{talent_audit_status_id}",
    status_code=status.HTTP_200_OK,
    dependencies=[Guard(OperationVerb.DELETE, EssenceName.TALENT_AUDIT_STATUS)],
)
async def delete_talent_audit_status(
    talent_audit_status_id: int,
    service: Annotated[
        TalentAuditStatusService, Depends(get_talent_audit_status_service)
    ],
):
    await service.delete_talent_audit_status(talent_audit_status_id)

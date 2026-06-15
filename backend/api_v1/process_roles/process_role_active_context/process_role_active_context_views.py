from fastapi import APIRouter, Depends
from fastapi.security import HTTPBearer
from typing import Annotated

from backend.api_v1.process_roles.process_role_active_context.process_role_active_context_schema import (
    MyScopes,
    ActiveContextRead,
    ActiveContextUpdate,
)
from backend.api_v1.process_roles.process_role_active_context.process_role_active_context_dependencies import (
    get_process_role_active_context_service,
)
from backend.api_v1.process_roles.process_role_active_context.process_role_active_context_service import (
    ProcessRoleActiveContextService,
)

router = APIRouter(
    prefix="/people_review",
    tags=["People Review Scope"],
    dependencies=[Depends(HTTPBearer(auto_error=False))],
)


@router.get("/my_scopes", response_model=MyScopes)
async def get_my_scopes(
    service: Annotated[
        ProcessRoleActiveContextService,
        Depends(get_process_role_active_context_service),
    ],
):
    return await service.get_my_scopes()


@router.put("/active_context", response_model=ActiveContextRead)
async def set_active_context(
    payload: ActiveContextUpdate,
    service: Annotated[
        ProcessRoleActiveContextService,
        Depends(get_process_role_active_context_service),
    ],
):
    return await service.set_active(payload)

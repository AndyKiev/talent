from fastapi import APIRouter, Depends
from typing import Annotated

from backend.api_v1.process_roles.process_role_active_context.process_role_active_context_schema import (
    MyScopes,
    ActiveContextRead,
    ActiveContextUpdate,
    SessionScopeAvailability,
)
from backend.api_v1.process_roles.process_role_active_context.process_role_active_context_dependencies import (
    get_process_role_active_context_service,
)
from backend.api_v1.process_roles.process_role_active_context.process_role_active_context_service import (
    ProcessRoleActiveContextService,
)
from backend.auth.jwt_auth import get_current_active_auth_user

router = APIRouter(
    prefix="/people_review",
    tags=["People Review Scope"],
    dependencies=[Depends(get_current_active_auth_user)],
)


@router.get("/my_scopes", response_model=MyScopes)
async def get_my_scopes(
    service: Annotated[
        ProcessRoleActiveContextService,
        Depends(get_process_role_active_context_service),
    ],
):
    return await service.get_my_scopes()


@router.get(
    "/session_availability/{session_id}", response_model=SessionScopeAvailability
)
async def get_session_availability(
    session_id: int,
    service: Annotated[
        ProcessRoleActiveContextService,
        Depends(get_process_role_active_context_service),
    ],
):
    return await service.get_session_availability(session_id)


@router.put("/active_context", response_model=ActiveContextRead)
async def set_active_context(
    payload: ActiveContextUpdate,
    service: Annotated[
        ProcessRoleActiveContextService,
        Depends(get_process_role_active_context_service),
    ],
):
    return await service.set_active(payload)

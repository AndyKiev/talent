from typing import Annotated

from fastapi import APIRouter, Depends, status

from backend.api_v1.access_test_context.access_test_context_dependencies import (
    get_access_test_context_service,
)
from backend.api_v1.access_test_context.access_test_context_schema import (
    AccessTestContextSet,
    AccessTestState,
)
from backend.api_v1.access_test_context.access_test_context_service import (
    AccessTestContextService,
)
from backend.auth.jwt_auth import get_current_active_auth_user

# Auth-only (NO essence Guard): while testing, the user's is_bypass is forced
# off and permission_sets shrink to the impersonated groups — so the exit/state
# routes must never depend on a permission the tested group might lack, or the
# developer could get stuck. Entry is gated in the service via real_is_bypass.
router = APIRouter(
    prefix="/access_test",
    tags=["Access Testing"],
    dependencies=[Depends(get_current_active_auth_user)],
)


@router.get("/my", response_model=AccessTestState)
async def get_my_access_test(
    service: Annotated[
        AccessTestContextService, Depends(get_access_test_context_service)
    ],
):
    return await service.get_my_state()


@router.put("/context", response_model=AccessTestState)
async def set_access_test_context(
    payload: AccessTestContextSet,
    service: Annotated[
        AccessTestContextService, Depends(get_access_test_context_service)
    ],
):
    return await service.set_context(payload)


@router.delete(
    "/context", response_model=AccessTestState, status_code=status.HTTP_200_OK
)
async def clear_access_test_context(
    service: Annotated[
        AccessTestContextService, Depends(get_access_test_context_service)
    ],
):
    return await service.clear_context()

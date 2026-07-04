from typing import Annotated

from fastapi import APIRouter, Depends

from backend.api_v1.base.mutation_response import MutationResponse
from backend.api_v1.employee_language_profile.employee_language_profile_dependencies import (
    get_employee_language_profile_service,
)
from backend.api_v1.employee_language_profile.employee_language_profile_schema import (
    EmployeeLanguageProfileSchema,
    EmployeeLanguageProfileUpsert,
)
from backend.api_v1.employee_language_profile.employee_language_profile_service import (
    EmployeeLanguageProfileService,
)
from backend.auth.jwt_auth import get_current_active_auth_user

router = APIRouter(
    prefix="/employee_language_profiles",
    tags=["Employee Language Profiles"],
    dependencies=[Depends(get_current_active_auth_user)],
)


@router.get("/by_employee/{employee_id}", response_model=EmployeeLanguageProfileSchema)
async def get_profile_by_employee(
    employee_id: int,
    service: Annotated[
        EmployeeLanguageProfileService, Depends(get_employee_language_profile_service)
    ],
):
    return await service.get_by_employee(employee_id)


@router.put(
    "/by_employee/{employee_id}",
    response_model=MutationResponse[EmployeeLanguageProfileSchema],
)
async def upsert_profile_by_employee(
    employee_id: int,
    payload: EmployeeLanguageProfileUpsert,
    service: Annotated[
        EmployeeLanguageProfileService, Depends(get_employee_language_profile_service)
    ],
):
    return await service.upsert_languages(employee_id, payload)

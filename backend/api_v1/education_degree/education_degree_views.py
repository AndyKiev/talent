from fastapi import APIRouter, Depends
from typing import Annotated, Optional, List

from backend.api_v1.education_degree.education_degree_schema import (
    EducationDegree as EducationDegreeSchema,
)
from backend.api_v1.education_degree.education_degree_dependencies import (
    get_education_degree_service,
)
from backend.api_v1.education_degree.education_degree_service import (
    EducationDegreeService,
)
from backend.auth.jwt_auth import get_current_active_auth_user

router = APIRouter(
    prefix="/education_degrees",
    tags=["Education Degrees"],
    dependencies=[Depends(get_current_active_auth_user)],
)


@router.get("", response_model=List[EducationDegreeSchema])
async def get_education_degrees(
    service: Annotated[EducationDegreeService, Depends(get_education_degree_service)],
    is_active: Optional[bool] = None,
):
    return await service.get_degrees(is_active=is_active)

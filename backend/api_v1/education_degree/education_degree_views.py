from fastapi import APIRouter, Depends
from fastapi.security import HTTPBearer
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

router = APIRouter(
    prefix="/education_degrees",
    tags=["Education Degrees"],
    dependencies=[Depends(HTTPBearer(auto_error=False))],
)


@router.get("", response_model=List[EducationDegreeSchema])
async def get_education_degrees(
    service: Annotated[EducationDegreeService, Depends(get_education_degree_service)],
    is_active: Optional[bool] = None,
):
    return await service.get_degrees(is_active=is_active)

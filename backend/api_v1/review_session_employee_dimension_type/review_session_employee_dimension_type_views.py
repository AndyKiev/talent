from typing import Annotated, List

from fastapi import APIRouter, Depends
from fastapi.security import HTTPBearer

from backend.api_v1.review_session_employee_dimension_type.review_session_employee_dimension_type_dependencies import (
    get_review_session_employee_dimension_type_service,
)
from backend.api_v1.review_session_employee_dimension_type.review_session_employee_dimension_type_schema import (
    ReviewSessionEmployeeDimensionType as RseDimensionTypeSchema,
)
from backend.api_v1.review_session_employee_dimension_type.review_session_employee_dimension_type_service import (
    ReviewSessionEmployeeDimensionTypeService,
)

router = APIRouter(
    prefix="/review_session_employee_dimension_types",
    tags=["Competence Summary Types"],
    dependencies=[Depends(HTTPBearer(auto_error=False))],
)


@router.get("", response_model=List[RseDimensionTypeSchema])
async def get_review_session_employee_dimension_types(
    service: Annotated[
        ReviewSessionEmployeeDimensionTypeService,
        Depends(get_review_session_employee_dimension_type_service),
    ],
):
    """The summary's two sides, in display order. Read-only and open to any
    authenticated user: the people-review page needs these ids to send its
    summary, and a plain employee reading their own review renders the section
    headings from them."""
    return await service.get_all(sort={"sort_order": "asc"})

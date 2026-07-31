from typing import Annotated

from fastapi import APIRouter, Depends
from fastapi.security import HTTPBearer

from backend.api_v1.employee_fact_type.employee_fact_type_dependencies import (
    get_employee_fact_type_service,
)
from backend.api_v1.employee_fact_type.employee_fact_type_schema import (
    EmployeeFactType as EmployeeFactTypeSchema,
)
from backend.api_v1.employee_fact_type.employee_fact_type_service import (
    EmployeeFactTypeService,
)

router = APIRouter(
    prefix="/employee_fact_types",
    tags=["Employee Fact Types"],
    dependencies=[Depends(HTTPBearer(auto_error=False))],
)


@router.get("", response_model=list[EmployeeFactTypeSchema])
async def get_employee_fact_types(
    service: Annotated[
        EmployeeFactTypeService,
        Depends(get_employee_fact_type_service),
    ],
):
    """The two kinds of numbered list, in display order. Read-only and open to
    any authenticated user: the quick-registration dialog needs these ids for
    its selector, and the evaluation page renders both list headings from them."""
    return await service.get_all(sort={"sort_order": "asc"})

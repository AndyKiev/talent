from typing import Annotated, Optional

from fastapi import APIRouter, Depends
from fastapi.security import HTTPBearer

from backend.api_v1.base.mutation_response import MutationResponse
from backend.api_v1.employee_development_vision.employee_development_vision_dependencies import (
    get_employee_development_vision_service,
)
from backend.api_v1.employee_development_vision.employee_development_vision_schema import (
    EmployeeDevelopmentVisionSchema,
    EmployeeDevelopmentVisionSet,
)
from backend.api_v1.employee_development_vision.employee_development_vision_service import (
    EmployeeDevelopmentVisionService,
)
from backend.api_v1.review_session_employee.people_review_access import (
    PeopleReviewScopedGuard,
)
from backend.utils.enums import EssenceName, OperationVerb

router = APIRouter(
    prefix="/employee_development_visions",
    tags=["Employee Development Vision"],
    dependencies=[Depends(HTTPBearer(auto_error=False))],
)


@router.get(
    "/employee/{employee_id}",
    response_model=Optional[EmployeeDevelopmentVisionSchema],
    dependencies=[
        PeopleReviewScopedGuard(
            OperationVerb.VIEW, EssenceName.EMPLOYEE_DEVELOPMENT_VISION
        )
    ],
)
async def get_vision_for_employee(
    employee_id: int,
    service: Annotated[
        EmployeeDevelopmentVisionService,
        Depends(get_employee_development_vision_service),
    ],
):
    """The employee's development vision, or null when not written yet."""
    return await service.get_for_employee(employee_id)


@router.put(
    "/employee/{employee_id}",
    response_model=MutationResponse[EmployeeDevelopmentVisionSchema],
)
async def set_vision_for_employee(
    employee_id: int,
    payload: EmployeeDevelopmentVisionSet,
    service: Annotated[
        EmployeeDevelopmentVisionService,
        Depends(get_employee_development_vision_service),
    ],
):
    """Upsert. Only the employee themselves (or admin/dev) — enforced in the
    service by assert_can_author, since the read guard here would also let an
    oversight manager or line manager through, and they must not write it."""
    return await service.set_for_employee(employee_id, payload.text)

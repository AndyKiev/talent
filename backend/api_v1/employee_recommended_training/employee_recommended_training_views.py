from typing import Annotated, List

from fastapi import APIRouter, Depends, Query, status
from fastapi.security import HTTPBearer

from backend.api_v1.base.mutation_response import MutationResponse
from backend.api_v1.employee_recommended_training.employee_recommended_training_dependencies import (
    get_employee_recommended_training_service,
)
from backend.api_v1.employee_recommended_training.employee_recommended_training_schema import (
    EmployeeRecommendedTraining as RecommendedTrainingSchema,
    EmployeeRecommendedTrainingCreate,
    EmployeeRecommendedTrainingList,
    EmployeeRecommendedTrainingReorder,
    EmployeeRecommendedTrainingUpdate,
    RecommendedTrainingStatusSchema,
)
from backend.api_v1.employee_recommended_training.employee_recommended_training_service import (
    EmployeeRecommendedTrainingService,
)
from backend.api_v1.employee_recommended_training_status.employee_recommended_training_status_model import (
    EmployeeRecommendedTrainingStatus,
)
from backend.api_v1.review_session_employee.people_review_access import (
    PeopleReviewScopedGuard,
)
from backend.database.db_helper import db_helper
from backend.utils.enums import EssenceName, OperationVerb

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(
    prefix="/employee_recommended_trainings",
    tags=["Employee Recommended Trainings"],
    dependencies=[Depends(HTTPBearer(auto_error=False))],
)


@router.get("/statuses", response_model=List[RecommendedTrainingStatusSchema])
async def get_recommended_training_statuses(
    session: AsyncSession = Depends(db_helper.session_getter),
):
    """The seeded status list, in display order. Open to any authenticated user:
    both the employee and their oversight manager pick from it, and neither is
    necessarily an admin."""
    rows = (
        await session.execute(
            select(EmployeeRecommendedTrainingStatus).order_by(
                EmployeeRecommendedTrainingStatus.sort_order,
                EmployeeRecommendedTrainingStatus.id,
            )
        )
    ).scalars()
    return list(rows)


@router.get(
    "/employee/{employee_id}",
    response_model=EmployeeRecommendedTrainingList,
    dependencies=[
        PeopleReviewScopedGuard(
            OperationVerb.VIEW, EssenceName.EMPLOYEE_RECOMMENDED_TRAINING
        )
    ],
)
async def get_employee_recommended_trainings(
    employee_id: int,
    service: Annotated[
        EmployeeRecommendedTrainingService,
        Depends(get_employee_recommended_training_service),
    ],
    include_inactive: bool = Query(False),
):
    """The employee's recommended trainings + what the caller may do with them.

    Active-only unless `include_inactive` is set — that flag is the "show all"
    toggle, which exists because retiring a recommendation marks it inactive
    rather than deleting it.
    """
    return await service.get_for_employee(
        employee_id, include_inactive=include_inactive
    )


@router.post(
    "/employee/{employee_id}",
    response_model=MutationResponse[RecommendedTrainingSchema],
    status_code=status.HTTP_201_CREATED,
)
async def create_employee_recommended_training(
    employee_id: int,
    payload: EmployeeRecommendedTrainingCreate,
    service: Annotated[
        EmployeeRecommendedTrainingService,
        Depends(get_employee_recommended_training_service),
    ],
):
    """Add a recommendation. Both the employee and their oversight manager may;
    the write check lives in the service (see the access module)."""
    return await service.create_for_employee(employee_id, payload)


@router.post(
    "/employee/{employee_id}/reorder",
    response_model=MutationResponse[None],
)
async def reorder_employee_recommended_trainings(
    employee_id: int,
    payload: EmployeeRecommendedTrainingReorder,
    service: Annotated[
        EmployeeRecommendedTrainingService,
        Depends(get_employee_recommended_training_service),
    ],
):
    return await service.reorder_for_employee(employee_id, payload.ordered_ids)


@router.patch(
    "/{training_id}", response_model=MutationResponse[RecommendedTrainingSchema]
)
async def update_recommended_training(
    training_id: int,
    payload: EmployeeRecommendedTrainingUpdate,
    service: Annotated[
        EmployeeRecommendedTrainingService,
        Depends(get_employee_recommended_training_service),
    ],
):
    """Edit the text, move the status, or toggle is_active.

    NO route guard: there is no `{employee_id}` here to scope on, and ids are
    sequential — the service resolves the owner from the row first, then applies
    the same check."""
    return await service.update_training(training_id, payload)


@router.delete("/{training_id}", status_code=status.HTTP_200_OK)
async def delete_recommended_training(
    training_id: int,
    service: Annotated[
        EmployeeRecommendedTrainingService,
        Depends(get_employee_recommended_training_service),
    ],
):
    """Oversight manager or admin only — the employee retires a recommendation
    by setting is_active false, which keeps the record."""
    await service.delete_training(training_id)

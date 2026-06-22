from fastapi import APIRouter, Depends, Query
from fastapi.security import HTTPBearer
from typing import Annotated, List

from backend.api_v1.base.mutation_response import MutationResponse
from backend.api_v1.review_session_employee_evaluation.review_session_employee_evaluation_schema import (
    Evaluation as EvaluationSchema,
    EvaluationUpdate,
    EvaluationBulkUpdate,
    EvaluationFlipCompetence,
)
from backend.api_v1.review_session_employee_evaluation.review_session_employee_evaluation_dependencies import (
    get_evaluation_service,
)
from backend.api_v1.review_session_employee_evaluation.review_session_employee_evaluation_service import (
    ReviewSessionEmployeeEvaluationService,
)

router = APIRouter(
    prefix="/review_evaluations",
    tags=["Review Evaluations"],
    dependencies=[Depends(HTTPBearer(auto_error=False))],
)


@router.get("", response_model=List[EvaluationSchema])
async def get_evaluations(
    service: Annotated[
        ReviewSessionEmployeeEvaluationService,
        Depends(get_evaluation_service),
    ],
    review_session_employee_id: int = Query(...),
):
    return await service.get_evaluations(
        review_session_employee_id=review_session_employee_id
    )


@router.patch(
    "/{evaluation_id}",
    response_model=MutationResponse[EvaluationSchema],
)
async def update_evaluation(
    evaluation_id: int,
    eval_update: EvaluationUpdate,
    service: Annotated[
        ReviewSessionEmployeeEvaluationService,
        Depends(get_evaluation_service),
    ],
):
    return await service.update_evaluation(evaluation_id, eval_update)


@router.put(
    "/bulk",
    response_model=MutationResponse[List[EvaluationSchema]],
)
async def bulk_update_evaluations(
    updates: List[EvaluationBulkUpdate],
    service: Annotated[
        ReviewSessionEmployeeEvaluationService,
        Depends(get_evaluation_service),
    ],
):
    return await service.bulk_update(updates)


@router.post(
    "/{evaluation_id}/flip_competence",
    response_model=MutationResponse[EvaluationSchema],
)
async def flip_competence(
    evaluation_id: int,
    payload: EvaluationFlipCompetence,
    service: Annotated[
        ReviewSessionEmployeeEvaluationService,
        Depends(get_evaluation_service),
    ],
):
    return await service.flip_competence(evaluation_id, payload)

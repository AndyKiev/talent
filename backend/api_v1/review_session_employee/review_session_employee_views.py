from fastapi import APIRouter, Depends, status, Query, Response
from fastapi.responses import HTMLResponse
from fastapi.security import HTTPBearer
from typing import Annotated, Optional, List

from backend.api_v1.base.mutation_response import MutationResponse
from backend.api_v1.review_session_employee.review_session_employee_schema import (
    ReviewSessionEmployee as RSESchema,
    ReviewSessionEmployeeList as RSEListSchema,
    ReviewSessionEmployeeFieldsUpdate,
    ReviewSessionEmployeeCreate,
    ReviewSessionEmployeeReorder,
)
from backend.api_v1.review_session_employee.review_session_employee_dependencies import (
    get_review_session_employee_service,
)
from backend.api_v1.review_session_employee.review_session_employee_service import (
    ReviewSessionEmployeeService,
)
from backend.api_v1.employee.employee_schema import EmployeeSchema as UserSchema
from backend.auth.jwt_auth import get_current_active_auth_user

router = APIRouter(
    prefix="/review_session_employees",
    tags=["Review Session Employees"],
    dependencies=[Depends(HTTPBearer(auto_error=False))],
)


@router.get("", response_model=List[RSEListSchema])
async def get_review_session_employees(
    service: Annotated[
        ReviewSessionEmployeeService,
        Depends(get_review_session_employee_service),
    ],
    session_id: int = Query(...),
    status_filter: Optional[str] = Query(None, alias="status"),
    sort: Optional[str] = Query(None),
):
    return await service.get_session_employees(
        session_id=session_id, status=status_filter, sort=sort
    )


@router.post(
    "",
    response_model=MutationResponse[RSEListSchema],
    status_code=status.HTTP_201_CREATED,
)
async def add_session_employee(
    payload: ReviewSessionEmployeeCreate,
    service: Annotated[
        ReviewSessionEmployeeService,
        Depends(get_review_session_employee_service),
    ],
):
    return await service.add_employee(
        session_id=payload.session_id, employee_id=payload.employee_id
    )


@router.post("/reorder", response_model=MutationResponse[None])
async def reorder_session_employees(
    payload: ReviewSessionEmployeeReorder,
    service: Annotated[
        ReviewSessionEmployeeService,
        Depends(get_review_session_employee_service),
    ],
):
    return await service.set_queue_order(payload.session_id, payload.ordered_ids)


@router.get("/my", response_model=List[RSEListSchema])
async def get_my_reviews(
    service: Annotated[
        ReviewSessionEmployeeService,
        Depends(get_review_session_employee_service),
    ],
    user: UserSchema = Depends(get_current_active_auth_user),
):
    return await service.get_my_reviews(employee_id=user.id)


@router.get("/my_latest", response_model=Optional[RSEListSchema])
async def get_my_latest_open_review(
    service: Annotated[
        ReviewSessionEmployeeService,
        Depends(get_review_session_employee_service),
    ],
):
    return await service.get_my_latest_open()


@router.get(
    "/by_session/{session_id}/employee/{employee_id}",
    response_model=RSESchema,
)
async def get_rse_by_session_employee(
    session_id: int,
    employee_id: int,
    service: Annotated[
        ReviewSessionEmployeeService,
        Depends(get_review_session_employee_service),
    ],
):
    return await service.get_rse_detail_by_session_employee(session_id, employee_id)


@router.get("/{rse_id}/tempo_png")
async def get_tempo_png(
    rse_id: int,
    service: Annotated[
        ReviewSessionEmployeeService,
        Depends(get_review_session_employee_service),
    ],
):
    """TEMPO album as a PNG — used by the in-dialog viewer because a browser
    renders images inline, whereas an application/pdf iframe is downloaded in
    many browsers. Visibility-gated inside the service (out-of-scope -> 404)."""
    png_bytes = await service.build_tempo_png(rse_id)
    return Response(content=png_bytes, media_type="image/png")


@router.get("/{rse_id}/tempo_pdf")
async def get_tempo_pdf(
    rse_id: int,
    service: Annotated[
        ReviewSessionEmployeeService,
        Depends(get_review_session_employee_service),
    ],
):
    """TEMPO Managers evaluation album as a single landscape-A4 PDF (download).
    Visibility-gated inside the service (out-of-scope record -> 404)."""
    pdf_bytes = await service.build_tempo_pdf(rse_id)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="tempo_{rse_id}.pdf"'},
    )


@router.get("/tempo_presentation", response_class=HTMLResponse)
async def get_tempo_presentation(
    service: Annotated[
        ReviewSessionEmployeeService,
        Depends(get_review_session_employee_service),
    ],
    session_id: int = Query(...),
):
    """Presentation: every employee the user can see in the session (in roster
    order) as one HTML document with ◀ ▶ navigation. Fetched with the JWT and
    opened as a blob; all slide navigation is client-side."""
    return HTMLResponse(content=await service.build_tempo_presentation(session_id))


@router.get("/{rse_id}/tempo_html", response_class=HTMLResponse)
async def get_tempo_html(
    rse_id: int,
    service: Annotated[
        ReviewSessionEmployeeService,
        Depends(get_review_session_employee_service),
    ],
):
    """TEMPO album for one employee as a self-contained HTML page (interactive
    single-page view with an in-page link to the level requirements)."""
    return HTMLResponse(content=await service.build_tempo_html(rse_id))


@router.get("/{rse_id}", response_model=RSESchema)
async def get_review_session_employee(
    rse_id: int,
    service: Annotated[
        ReviewSessionEmployeeService,
        Depends(get_review_session_employee_service),
    ],
):
    return await service.get_rse_detail(rse_id)


@router.patch("/{rse_id}/fields", response_model=RSESchema)
async def update_rse_fields(
    rse_id: int,
    payload: ReviewSessionEmployeeFieldsUpdate,
    service: Annotated[
        ReviewSessionEmployeeService,
        Depends(get_review_session_employee_service),
    ],
):
    return await service.update_fields(rse_id, payload)


@router.post(
    "/{rse_id}/reviewed",
    response_model=MutationResponse[RSESchema],
)
async def mark_reviewed(
    rse_id: int,
    service: Annotated[
        ReviewSessionEmployeeService,
        Depends(get_review_session_employee_service),
    ],
):
    return await service.change_status(rse_id, "reviewed")


@router.post(
    "/{rse_id}/close",
    response_model=MutationResponse[RSESchema],
)
async def close_rse(
    rse_id: int,
    service: Annotated[
        ReviewSessionEmployeeService,
        Depends(get_review_session_employee_service),
    ],
):
    return await service.change_status(rse_id, "closed")


@router.post(
    "/{rse_id}/revert",
    response_model=MutationResponse[RSESchema],
)
async def revert_rse(
    rse_id: int,
    service: Annotated[
        ReviewSessionEmployeeService,
        Depends(get_review_session_employee_service),
    ],
):
    return await service.revert_status(rse_id)


@router.post(
    "/{rse_id}/reopen",
    response_model=MutationResponse[RSESchema],
)
async def reopen_rse(
    rse_id: int,
    service: Annotated[
        ReviewSessionEmployeeService,
        Depends(get_review_session_employee_service),
    ],
):
    return await service.reopen(rse_id)

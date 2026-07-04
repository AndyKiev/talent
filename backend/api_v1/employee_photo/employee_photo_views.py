from fastapi import APIRouter, Depends, File, Response, UploadFile
from typing import Annotated

from backend.api_v1.base.mutation_response import MutationResponse
from backend.api_v1.employee_photo.employee_photo_schema import EmployeePhotoMeta
from backend.api_v1.employee_photo.employee_photo_errors import EmployeePhotoNotFound
from backend.api_v1.employee_photo.employee_photo_dependencies import (
    get_employee_photo_service,
)
from backend.api_v1.employee_photo.employee_photo_service import EmployeePhotoService
from backend.auth.jwt_auth import get_current_active_auth_user

# Photo is a 1:1 sub-resource of an employee.
router = APIRouter(
    prefix="/employees",
    tags=["Employee Photo"],
    dependencies=[Depends(get_current_active_auth_user)],
)


@router.get("/{employee_id}/photo")
async def get_employee_photo(
    employee_id: int,
    service: Annotated[EmployeePhotoService, Depends(get_employee_photo_service)],
):
    record = await service.get_photo(employee_id)
    if record is None:
        # 404 → the frontend falls back to the initials avatar.
        raise EmployeePhotoNotFound(employee_id)
    return Response(
        content=record.data,
        media_type=record.content_type,
        headers={"Cache-Control": "no-cache"},
    )


@router.put(
    "/{employee_id}/photo",
    response_model=MutationResponse[EmployeePhotoMeta],
)
async def upload_employee_photo(
    employee_id: int,
    service: Annotated[EmployeePhotoService, Depends(get_employee_photo_service)],
    file: UploadFile = File(...),
):
    raw = await file.read()
    return await service.upsert_photo(employee_id, raw)


@router.delete(
    "/{employee_id}/photo",
    response_model=MutationResponse[None],
)
async def delete_employee_photo(
    employee_id: int,
    service: Annotated[EmployeePhotoService, Depends(get_employee_photo_service)],
):
    return await service.delete_photo(employee_id)

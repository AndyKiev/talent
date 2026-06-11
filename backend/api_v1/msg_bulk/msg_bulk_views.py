# backend/api_v1/msg_bulk/msg_bulk_views.py
import io
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status, Body
from starlette.responses import StreamingResponse

from backend.api_v1.msg_bulk.msg_bulk_dependencies import get_msg_bulk_service
from backend.api_v1.msg_bulk.msg_bulk_schema import BulkImportResult
from backend.api_v1.msg_bulk.msg_bulk_service import MsgBulkService

router = APIRouter(prefix="/msg_bulk", tags=["Message Bulk"])

ServiceDep = Annotated[MsgBulkService, Depends(get_msg_bulk_service)]


# ── JSON ───────────────────────────────────────────────────────────────────────

@router.get(
    "/export_json",
    summary="Export all translations as JSON",
    response_class=StreamingResponse,
)
async def export_json(
    filename: str = "translations_export.json",
    service: ServiceDep = None,
):
    content = await service.export_json()
    return StreamingResponse(
        io.BytesIO(content),
        media_type="application/json",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.post(
    "/import_json_file",
    response_model=BulkImportResult,
    summary="Import translations from a .json file upload",
)
async def import_json_file(
    service: ServiceDep,
    file: UploadFile = File(...),
):
    if not file.filename.endswith(".json"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File must have a .json extension",
        )
    raw = await file.read()
    return await service.import_json(raw)


@router.post(
    "/import_json_text",
    response_model=BulkImportResult,
    summary="Import translations from raw JSON text (paste from clipboard)",
)
async def import_json_text(
    service: ServiceDep,
    text: str = Body(..., media_type="text/plain"),
):
    """
    Accepts raw JSON as a plain-text request body.
    Useful for a frontend 'paste JSON' dialog without needing a file.
    """
    return await service.import_json(text.encode("utf-8"))


# ── Excel ──────────────────────────────────────────────────────────────────────

@router.get(
    "/export_excel",
    summary="Export all translations as Excel (.xlsx)",
    response_class=StreamingResponse,
)
async def export_excel(
    filename: str = "translations_export.xlsx",
    service: ServiceDep = None,
):
    content = await service.export_excel()
    return StreamingResponse(
        io.BytesIO(content),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.post(
    "/import_excel",
    response_model=BulkImportResult,
    summary="Import translations from an Excel (.xlsx) file upload",
)
async def import_excel(
    service: ServiceDep,
    file: UploadFile = File(...),
):
    if not file.filename.endswith(".xlsx"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File must have a .xlsx extension",
        )
    raw = await file.read()
    return await service.import_excel(raw)

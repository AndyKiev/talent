from fastapi import APIRouter, Depends, status
# from fastapi import APIRouter, Depends, status, Query
# from fastapi.security import HTTPBearer
from typing import Annotated, Optional, List
# from pydantic import BaseModel
from backend.api_v1.lang.lang_model import Lang as LangModel
from backend.api_v1.base.errors import NotFoundError
from backend.api_v1.lang.lang_dependencies import get_lang_service, lang_by_id
# from backend.api_v1.lang.lang_errors import LangNotFoundByName
from backend.api_v1.lang.lang_schema import Lang as LangSchema, LangCreate, LangUpdate
from backend.api_v1.lang.lang_service import LangService


router = APIRouter(
    prefix="/langs",
    tags=["Languages"],
    # dependencies=[Depends(HTTPBearer(auto_error=False))],
)


@router.get("", response_model=List[LangSchema])
async def get_langs(
    service: Annotated[LangService, Depends(get_lang_service)],
    name: Optional[str] = None,
):
    if name:
        # lang = await service.get_by_name(name, not_found_exc=LangNotFoundByName)
        lang = await service.get_by_name(name, not_found_exc=NotFoundError)
        # job = await self.get_by_name(name)
        return [LangSchema.model_validate(lang)]
    langs = await service.get_all()
    return [LangSchema.model_validate(l) for l in langs]

#
@router.get("/{lang_id}", response_model=LangSchema)
async def get_lang(job: LangSchema = Depends(lang_by_id)):
    return job


@router.post("", response_model=LangSchema, status_code=status.HTTP_201_CREATED)
async def create_lang(
    lang_in: LangCreate,
    service: Annotated[LangService, Depends(get_lang_service)],
):
    return await service.create(lang_in)


@router.patch("/{lang_id}", response_model=LangSchema)
async def update_lang(
    lang_update: LangUpdate,
    lang: LangModel = Depends(lang_by_id),   # ← LangModel not LangSchema
    service: Annotated[LangService, Depends(get_lang_service)] = None,
):
    return await service.update(lang, lang_update)


@router.delete("/{lang_id}", status_code=status.HTTP_200_OK)
async def delete_lang(
    service: Annotated[LangService, Depends(get_lang_service)],
    lang: LangModel = Depends(lang_by_id),   # ← LangModel not LangSchema
):
    await service.delete(lang)

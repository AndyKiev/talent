from typing import Annotated

from backend.api_v1.base.mutation_response import MutationResponse
from backend.api_v1.menu.menu_dependencies import get_menu_service
from backend.api_v1.menu.menu_schema import (
    MenuAdminSchema,
    MenuCreate,
    MenuSchema,
    MenuUpdate,
)
from backend.api_v1.menu.menu_service import MenuService
from backend.auth.guards import Guard
from backend.utils.enums import EssenceName, OperationVerb
from fastapi import APIRouter, Depends, status
from fastapi.security import HTTPBearer

# The two public reads (/menus, /menus/my) carry NO set-permission Guard: every
# authenticated user needs their own menu to render the navigation. The editor
# endpoints below ARE guarded — they are developer-only.
router = APIRouter(
    prefix="/menus",
    tags=["Menus"],
    dependencies=[Depends(HTTPBearer(auto_error=False))],
)


@router.get(
    "",
    response_model=list[MenuSchema],
    summary="All active menu items (developer default-menu select)",
)
async def get_menus(
    service: Annotated[MenuService, Depends(get_menu_service)],
):
    return await service.get_all_menus()


@router.get(
    "/my",
    response_model=list[MenuSchema],
    summary="Menu items visible to the current user",
)
async def get_my_menus(
    service: Annotated[MenuService, Depends(get_menu_service)],
):
    return await service.get_my_menus()


# ── Developer menu editor (CRUD) ──────────────────────────────────────────────


@router.get(
    "/manage",
    response_model=list[MenuAdminSchema],
    summary="All menu items with visibility config (developer editor)",
    dependencies=[Guard(OperationVerb.VIEW, EssenceName.MENU)],
)
async def get_menus_manage(
    service: Annotated[MenuService, Depends(get_menu_service)],
):
    return await service.get_menus_admin()


@router.post(
    "",
    response_model=MutationResponse[MenuAdminSchema],
    status_code=status.HTTP_201_CREATED,
    dependencies=[Guard(OperationVerb.CREATE, EssenceName.MENU)],
)
async def create_menu(
    menu_in: MenuCreate,
    service: Annotated[MenuService, Depends(get_menu_service)],
):
    return await service.create_menu(menu_in)


@router.patch(
    "/{menu_id}",
    response_model=MutationResponse[MenuAdminSchema],
    dependencies=[Guard(OperationVerb.MODIFY, EssenceName.MENU)],
)
async def update_menu(
    menu_id: int,
    menu_update: MenuUpdate,
    service: Annotated[MenuService, Depends(get_menu_service)],
):
    return await service.update_menu(menu_id, menu_update)


@router.delete(
    "/{menu_id}",
    status_code=status.HTTP_200_OK,
    dependencies=[Guard(OperationVerb.DELETE, EssenceName.MENU)],
)
async def delete_menu(
    menu_id: int,
    service: Annotated[MenuService, Depends(get_menu_service)],
):
    await service.delete_menu(menu_id)

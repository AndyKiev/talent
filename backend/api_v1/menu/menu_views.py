from fastapi import APIRouter, Depends
from fastapi.security import HTTPBearer
from typing import Annotated, List

from backend.api_v1.menu.menu_schema import MenuSchema
from backend.api_v1.menu.menu_dependencies import get_menu_service
from backend.api_v1.menu.menu_service import MenuService

# No set-permission Guards here: every authenticated user needs their own menu
# to render the navigation, and the full list only feeds the developer
# default-menu select (it exposes nothing sensitive).
router = APIRouter(
    prefix="/menus",
    tags=["Menus"],
    dependencies=[Depends(HTTPBearer(auto_error=False))],
)


@router.get(
    "",
    response_model=List[MenuSchema],
    summary="All active menu items (developer default-menu select)",
)
async def get_menus(
    service: Annotated[MenuService, Depends(get_menu_service)],
):
    return await service.get_all_menus()


@router.get(
    "/my",
    response_model=List[MenuSchema],
    summary="Menu items visible to the current user",
)
async def get_my_menus(
    service: Annotated[MenuService, Depends(get_menu_service)],
):
    return await service.get_my_menus()

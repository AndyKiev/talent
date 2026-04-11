from backend.config.config import settings
from backend.routers.start_router import router as start_router

from fastapi import APIRouter
router = APIRouter(prefix=settings.api_v1_prefix)
router.include_router(start_router)
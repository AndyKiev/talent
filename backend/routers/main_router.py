from backend.config.config import settings
from backend.routers.start_router import router as start_router
from backend.api_v1.message.message_views import router as message_router
from backend.routers.health_router import router as health_router
 
from fastapi import APIRouter
 
router = APIRouter(prefix=settings.api_v1_prefix)
router.include_router(start_router)
router.include_router(health_router)
router.include_router(message_router)
 
import logging
from pathlib import Path

from dotenv import load_dotenv

# Load .env into os.environ BEFORE any backend import that reads os.getenv
# (e.g. BYPASS_LDAP, RABBITMQ_ENABLED). Pydantic-settings reads .env on its
# own, but plain os.getenv calls do not — this bridges that gap.
load_dotenv(Path(__file__).resolve().parents[1] / ".env")

import uvicorn

from backend.config.config import settings
from backend.routers.main_router import router
from backend.utils.create_fastapi_app import create_app

logging.basicConfig(level=settings.log_config.log_level)
app = create_app(
    create_custom_static_urls=True,
)
app.include_router(router)
if __name__ == "__main__":
    uvicorn.run(
        app="main:app",
        host=settings.run.host,
        port=settings.run.port,
        reload=settings.run.reload,
    )

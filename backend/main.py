import logging

import uvicorn

from backend.utils.create_fastapi_app import create_app
from backend.config.config import settings
from backend.routers.main_router import router

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


# from fastapi import FastAPI

# app = FastAPI()

# @app.get("/")
# def root():
#     return {"message": "Talent APi is running"}

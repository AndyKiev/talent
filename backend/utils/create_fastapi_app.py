from fastapi import FastAPI, Request
from fastapi.responses import  JSONResponse
from starlette.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from backend.config.config import settings
from backend.api_v1.base.errors import (
    NotFoundError,
    AlreadyExistsError,
    RelationshipError,
    DomainError,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield


def _resolve_detail(exc: DomainError) -> str:
    return getattr(exc, "resolved_message", None) or str(exc)


def register_exception_handlers(app: FastAPI):
    @app.exception_handler(NotFoundError)
    async def not_found_handler(request: Request, exc: NotFoundError):
        return JSONResponse(status_code=404, content={"detail": _resolve_detail(exc)})

    @app.exception_handler(AlreadyExistsError)
    async def already_exists_handler(request: Request, exc: AlreadyExistsError):
        return JSONResponse(status_code=400, content={"detail": _resolve_detail(exc)})

    @app.exception_handler(RelationshipError)
    async def relationship_handler(request: Request, exc: RelationshipError):
        return JSONResponse(status_code=400, content={"detail": _resolve_detail(exc)})

    @app.exception_handler(DomainError)
    async def domain_error_handler(request: Request, exc: DomainError):
        return JSONResponse(status_code=400, content={"detail": _resolve_detail(exc)})


def create_app() -> FastAPI:
    app = FastAPI(
        default_response_class=JSONResponse,
        lifespan=lifespan,
        title="EDI API",
        version="1.0.0",
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors.origins,
        allow_credentials=settings.cors.credentials,
        allow_methods=settings.cors.methods,
        allow_headers=settings.cors.headers,
    )

    register_exception_handlers(app)

    return app
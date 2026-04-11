from fastapi import FastAPI, Request
from fastapi.responses import ORJSONResponse, JSONResponse
from fastapi.openapi.docs import get_swagger_ui_html
from pathlib import Path
from starlette.middleware.cors import CORSMiddleware
from starlette.staticfiles import StaticFiles
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


def register_static_docs_routes(app: FastAPI):
    @app.get("/docs", include_in_schema=False)
    async def custom_swagger_ui_html():
        return get_swagger_ui_html(
            openapi_url=app.openapi_url,
            title=app.title + " - Swagger UI",
            swagger_js_url="utils/assets/swagger-ui-bundle.js",
            swagger_css_url="utils/assets/swagger-ui.css",
        )


def _resolve_detail(exc: DomainError) -> str:
    """
    Return the already-translated message if the service populated it,
    otherwise fall back to the exception's plain __str__ (the old behaviour).

    Services call  exc.resolved_message = await self._translate(...)
    before re-raising, so the handler never needs a DB session.
    """
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
        """Catch-all for any other DomainError subclass (e.g. JobDeleteError)."""
        return JSONResponse(status_code=400, content={"detail": _resolve_detail(exc)})


def create_app(create_custom_static_urls: bool = False) -> FastAPI:
    app = FastAPI(
        default_response_class=ORJSONResponse,
        lifespan=lifespan,
        title="EDI API",
        version="1.0.0",
        docs_url=None if create_custom_static_urls else "/docs",
    )

    if create_custom_static_urls:
        assets_path = Path(__file__).resolve().parent
        app.mount("/utils", StaticFiles(directory=str(assets_path)), name="assets")
        register_static_docs_routes(app)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors.origins,
        allow_credentials=settings.cors.credentials,
        allow_methods=settings.cors.methods,
        allow_headers=settings.cors.headers,
    )

    register_exception_handlers(app)

    return app

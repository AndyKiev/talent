import asyncio
import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.openapi.docs import get_swagger_ui_html
from fastapi.responses import ORJSONResponse, JSONResponse
from starlette.middleware.cors import CORSMiddleware
from starlette.staticfiles import StaticFiles

from backend.config.config import settings
from backend.api_v1.base.errors import (
    NotFoundError,
    AlreadyExistsError,
    RelationshipError,
    DomainError,
)

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Start RabbitMQ consumer in background
    from backend.utils.rabbitmq import start_consumer
    from backend.api_v1.notifications.notification_store import add_and_broadcast

    async def on_notification(payload: dict) -> None:
        user_code = payload.get("user_code", "")
        message = payload.get("message", "")
        if user_code and message:
            await add_and_broadcast(user_code, message)

    consumer_task = asyncio.create_task(start_consumer(on_notification))
    logger.info("RabbitMQ notification consumer started.")
    try:
        yield
    finally:
        consumer_task.cancel()
        try:
            await consumer_task
        except asyncio.CancelledError:
            pass


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
        title="TALENT API",
        version="1.0.0",
        docs_url=None if create_custom_static_urls else "/docs",
    )

    if create_custom_static_urls:
        assets_path = Path(__file__).resolve().parent
        app.mount("/utils", StaticFiles(directory=str(assets_path)), name="assets")
        register_static_docs_routes(app)

    # Dev: allow all origins; credentials must be False when using wildcard
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=False,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    register_exception_handlers(app)

    return app

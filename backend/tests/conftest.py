"""Shared fixtures for the black-box API test layer.

These tests hit the ALREADY-RUNNING dev backend over HTTP (default
http://127.0.0.1:8004/api/v1). They never import backend code and never
start servers. Start the stack first (/start1), then:

    cd backend && poetry run pytest tests -q
"""

import os

import httpx
import pytest

DEFAULT_BASE_URL = "http://127.0.0.1:8004/api/v1"
ADMIN_USERNAME = "UKR7101004"
STACK_DOWN_MESSAGE = (
    "Dev stack is not running (backend unreachable at {url}). "
    "Start it first with /start1, then re-run the tests."
)


@pytest.fixture(scope="session")
def base_url() -> str:
    return os.getenv("E2E_API_BASE_URL", DEFAULT_BASE_URL).rstrip("/")


@pytest.fixture(scope="session", autouse=True)
def _stack_preflight(base_url: str) -> None:
    """Ping the backend before any test runs; abort the whole run if down."""
    try:
        httpx.get(f"{base_url}/jwt/register_config", timeout=5)
    except httpx.ConnectError:
        pytest.exit(STACK_DOWN_MESSAGE.format(url=base_url), returncode=2)


@pytest.fixture(scope="session")
def token(base_url: str) -> str:
    """Login as the bypass admin; fail fast if the backend is down."""
    try:
        response = httpx.post(
            f"{base_url}/jwt/login",
            data={"username": ADMIN_USERNAME, "password": "e2e"},
            timeout=10,
        )
    except httpx.ConnectError:
        pytest.exit(STACK_DOWN_MESSAGE.format(url=base_url), returncode=2)
    assert response.status_code == 200, f"Login failed: {response.text}"
    return response.json()["access_token"]


@pytest.fixture(scope="session")
def api(base_url: str, token: str):
    """Authenticated client with base_url preset; paths start with '/'."""
    with httpx.Client(
        base_url=base_url,
        headers={"Authorization": f"Bearer {token}"},
        timeout=30,
    ) as client:
        yield client

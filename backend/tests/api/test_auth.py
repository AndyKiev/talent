import httpx


def test_login_ok(base_url: str):
    response = httpx.post(
        f"{base_url}/jwt/login",
        data={"username": "UKR7101004", "password": "e2e"},
        timeout=10,
    )
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["access_token"]
    assert body["refresh_token"]
    assert body["token_type"].lower() == "bearer"


def test_login_unknown_user_rejected(base_url: str):
    response = httpx.post(
        f"{base_url}/jwt/login",
        data={"username": "E2E_NO_SUCH_USER", "password": "e2e"},
        timeout=10,
    )
    assert response.status_code in (401, 403), response.text


def test_users_me(api: httpx.Client):
    response = api.get("/jwt/users/me")
    assert response.status_code == 200, response.text
    assert response.json()["code"] == "UKR7101004"


def test_request_without_token_rejected(base_url: str):
    response = httpx.get(f"{base_url}/admin/department_categories", timeout=10)
    assert response.status_code in (401, 403), response.text

import httpx

from backend.tests.helpers.unique_name import unique_key, unique_name

PATH = "/talent_status_period_links"
STATUS_PATH = "/admin/talent_statuses"
PERIOD_PATH = "/admin/talent_periods"


def test_list_returns_rows(api: httpx.Client):
    response = api.get(PATH)
    assert response.status_code == 200, response.text
    assert isinstance(response.json(), list)


def test_crud_lifecycle(api: httpx.Client):
    # Create a status and a period first (FKs required).
    # Talent limits: name max 32, key max 8 - and keys must be UNIQUE
    # (never slice unique_name for a key: that keeps only the constant prefix).
    status_name = unique_name("tsl", 32)
    status_resp = api.post(STATUS_PATH, json={
        "name": status_name,
        "key": unique_key(8),
    })
    assert status_resp.status_code == 201, status_resp.text
    status_id = status_resp.json()["data"]["id"]

    period_resp = api.post(PERIOD_PATH, json={
        "name": unique_name("tpl", 32),
        "qty_months": 6,
    })
    assert period_resp.status_code == 201, period_resp.text
    period_id = period_resp.json()["data"]["id"]

    link_id = None
    try:
        # CREATE
        created = api.post(PATH, json={
            "talent_status_id": status_id,
            "talent_period_id": period_id,
        })
        assert created.status_code == 201, f"POST {PATH}: {created.text}"
        payload = created.json()
        assert "detail" in payload and "data" in payload
        link = payload["data"]
        link_id = link["id"]
        assert link["talent_status_id"] == status_id
        assert link["talent_period_id"] == period_id

        # FETCH
        fetched = api.get(f"{PATH}/{link_id}")
        assert fetched.status_code == 200, fetched.text
        assert fetched.json()["talent_status_id"] == status_id

        # UPDATE (toggle is_active)
        updated = api.patch(f"{PATH}/{link_id}", json={"is_active": False})
        assert updated.status_code == 200, f"PATCH {PATH}: {updated.text}"
        refetched = api.get(f"{PATH}/{link_id}").json()
        assert refetched["is_active"] is False

        # DELETE
        deleted = api.delete(f"{PATH}/{link_id}")
        assert deleted.status_code == 200, f"DELETE {PATH}: {deleted.status_code}"
        gone = api.get(f"{PATH}/{link_id}")
        assert gone.status_code == 404, f"Record still exists: {gone.text}"
        link_id = None
    finally:
        if link_id is not None:
            api.delete(f"{PATH}/{link_id}")
        api.delete(f"{STATUS_PATH}/{status_id}")
        api.delete(f"{PERIOD_PATH}/{period_id}")

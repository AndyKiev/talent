import httpx

from backend.tests.helpers.unique_name import unique_name

PATH = "/admin/user_groups"
TYPE_PATH = "/admin/user_group_types"


def test_list_returns_rows(api: httpx.Client):
    response = api.get(PATH)
    assert response.status_code == 200, response.text
    assert isinstance(response.json(), list)


def test_crud_lifecycle(api: httpx.Client):
    # User groups require a user_group_type_id FK — create one first.
    type_name = unique_name("ugt_for_group")
    type_resp = api.post(TYPE_PATH, json={
        "name": type_name,
    })
    assert type_resp.status_code == 201, type_resp.text
    type_id = type_resp.json()["data"]["id"]

    group_name = unique_name("user_group")
    group_id = None
    try:
        # CREATE
        created = api.post(PATH, json={
            "name": group_name,
            "user_group_type_id": type_id,
        })
        assert created.status_code == 201, f"POST {PATH}: {created.text}"
        payload = created.json()
        assert "detail" in payload and "data" in payload
        group = payload["data"]
        group_id = group["id"]
        assert group["name"] == group_name

        # FETCH
        fetched = api.get(f"{PATH}/{group_id}")
        assert fetched.status_code == 200, fetched.text
        assert fetched.json()["name"] == group_name

        # UPDATE
        updated = api.patch(f"{PATH}/{group_id}", json={"description": "E2E updated"})
        assert updated.status_code == 200, f"PATCH {PATH}: {updated.text}"
        refetched = api.get(f"{PATH}/{group_id}").json()
        assert refetched["description"] == "E2E updated"

        # DELETE (returns 204)
        deleted = api.delete(f"{PATH}/{group_id}")
        assert deleted.status_code in (200, 204), f"DELETE {PATH}: {deleted.status_code}"
        gone = api.get(f"{PATH}/{group_id}")
        assert gone.status_code == 404, f"Record still exists: {gone.text}"
        group_id = None
    finally:
        if group_id is not None:
            api.delete(f"{PATH}/{group_id}")
        api.delete(f"{TYPE_PATH}/{type_id}")

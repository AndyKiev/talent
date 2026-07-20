import httpx

from backend.tests.helpers.unique_name import unique_name

PATH = "/admin/plan_category_defaults"
CAT_PATH = "/admin/department_categories"


def test_list_returns_rows(api: httpx.Client):
    response = api.get(PATH)
    assert response.status_code == 200, response.text
    assert isinstance(response.json(), list)


def test_create_delete_lifecycle(api: httpx.Client):
    # plan_category_defaults has no PATCH — only POST/GET/DELETE.
    # Create a department_category first.
    cat_name = unique_name("pcd_cat")
    cat_resp = api.post(CAT_PATH, json={
        "name": cat_name,
        "description": "E2E temp for plan_category_default",
    })
    assert cat_resp.status_code == 201, cat_resp.text
    cat_id = cat_resp.json()["data"]["id"]

    record_id = None
    try:
        created = api.post(PATH, json={"department_category_id": cat_id})
        assert created.status_code == 201, f"POST {PATH}: {created.text}"
        payload = created.json()
        assert "detail" in payload and "data" in payload
        record_id = payload["data"]["id"]

        # No GET /{id} route on this essence (405) - verify via the LIST
        def in_list() -> bool:
            rows = api.get(PATH).json()
            return any(row["id"] == record_id for row in rows)

        assert in_list(), "Created record missing from list"

        deleted = api.delete(f"{PATH}/{record_id}")
        assert deleted.status_code == 200, f"DELETE {PATH}: {deleted.status_code}"
        assert not in_list(), "Record still present in list after delete"
        record_id = None
    finally:
        if record_id is not None:
            api.delete(f"{PATH}/{record_id}")
        api.delete(f"{CAT_PATH}/{cat_id}")

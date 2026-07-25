"""Reusable full CRUD lifecycle for a standard admin essence.

Mutating endpoints wrap results as MutationResponse {detail, data}; GETs
return the bare schema. A new essence gets API coverage with ~10 lines:

    def test_crud(api):
        run_crud_lifecycle(
            api,
            path="/admin/department_categories",
            create_body={"name": unique_name("dep_cat"), "sort_order": 9999},
            update_body={"description": "E2E updated"},
        )
"""


import httpx


def run_crud_lifecycle(
    api: httpx.Client,
    path: str,
    create_body: dict,
    update_body: dict,
    name_field: str = "name",
) -> None:
    record_id: int | None = None
    try:
        created = api.post(path, json=create_body)
        assert created.status_code == 201, f"POST {path}: {created.text}"
        payload = created.json()
        assert "detail" in payload and "data" in payload
        record = payload["data"]
        record_id = record["id"]
        assert record[name_field] == create_body[name_field]

        fetched = api.get(f"{path}/{record_id}")
        assert fetched.status_code == 200, fetched.text
        assert fetched.json()[name_field] == create_body[name_field]

        updated = api.patch(f"{path}/{record_id}", json=update_body)
        assert updated.status_code == 200, f"PATCH {path}: {updated.text}"
        refetched = api.get(f"{path}/{record_id}").json()
        for field, value in update_body.items():
            assert refetched[field] == value, f"{field} not updated: {refetched}"

        deleted = api.delete(f"{path}/{record_id}")
        assert deleted.status_code in (200, 204), f"DELETE {path}: {deleted.status_code} {deleted.text}"
        gone = api.get(f"{path}/{record_id}")
        assert gone.status_code == 404, f"Record still exists: {gone.text}"
        record_id = None
    finally:
        if record_id is not None:
            api.delete(f"{path}/{record_id}")

import httpx

from backend.tests.helpers.unique_name import unique_key, unique_name

PATH = "/admin/plan_scope_defaults"
JG_PATH = "/job_groups"
JGT_PATH = "/job_group_types"
TS_PATH = "/admin/talent_statuses"


def test_list_returns_rows(api: httpx.Client):
    response = api.get(PATH)
    assert response.status_code == 200, response.text
    assert isinstance(response.json(), list)


def test_create_delete_lifecycle(api: httpx.Client):
    # plan_scope_defaults has no PATCH — only POST/GET/DELETE.
    # Create a job_group (needs job_group_type) and a talent_status first.
    jgt_name = unique_name("psd_jgt")
    jgt_resp = api.post(JGT_PATH, json={
        "name": jgt_name,
        "key": unique_key(32),
    })
    assert jgt_resp.status_code == 201, jgt_resp.text
    jgt_id = jgt_resp.json()["data"]["id"]

    jg_resp = api.post(JG_PATH, json={
        "name": unique_name("psd_jg"),
        "key": unique_key(64),
        "job_group_type_id": jgt_id,
    })
    assert jg_resp.status_code == 201, jg_resp.text
    jg_id = jg_resp.json()["data"]["id"]

    ts_resp = api.post(TS_PATH, json={
        "name": unique_name("psd_ts", 32),
        "key": unique_key(8),
    })
    assert ts_resp.status_code == 201, ts_resp.text
    ts_id = ts_resp.json()["data"]["id"]

    record_id = None
    try:
        created = api.post(PATH, json={
            "job_group_id": jg_id,
            "talent_status_id": ts_id,
        })
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
        api.delete(f"{JG_PATH}/{jg_id}")
        api.delete(f"{JGT_PATH}/{jgt_id}")
        api.delete(f"{TS_PATH}/{ts_id}")

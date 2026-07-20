import httpx

from backend.tests.helpers.crud_lifecycle import run_crud_lifecycle
from backend.tests.helpers.unique_name import unique_key, unique_name

PATH = "/admin/talent_statuses"


def test_list_returns_rows(api: httpx.Client):
    response = api.get(PATH)
    assert response.status_code == 200, response.text
    assert isinstance(response.json(), list)


def test_crud_lifecycle(api: httpx.Client):
    run_crud_lifecycle(
        api,
        path=PATH,
        # Talent limits: name max 32, key max 8 (schema Field max_length)
        create_body={
            "name": unique_name("ts", 32),
            "key": unique_key(8),
            "description": "E2E pilot record",
        },
        update_body={"description": "E2E pilot record updated"},
    )

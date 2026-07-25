import httpx

from backend.tests.helpers.crud_lifecycle import run_crud_lifecycle
from backend.tests.helpers.unique_name import unique_key, unique_name

PATH = "/admin/employee_events/employee_event_direction_types"


def test_list_returns_rows(api: httpx.Client):
    response = api.get(PATH)
    assert response.status_code == 200, response.text
    assert isinstance(response.json(), list)


def test_crud_lifecycle(api: httpx.Client):
    run_crud_lifecycle(
        api,
        path=PATH,
        create_body={
            "code": unique_key(64),
            "name": unique_name("eedt", 128),
        },
        # Only name is patchable — no description field on this essence.
        update_body={"name": unique_name("eedt_upd", 128)},
    )

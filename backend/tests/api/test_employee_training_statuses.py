import httpx

from backend.tests.helpers.crud_lifecycle import run_crud_lifecycle
from backend.tests.helpers.unique_name import unique_key

PATH = "/employee_training_statuses"


def test_list_returns_rows(api: httpx.Client):
    response = api.get(PATH)
    assert response.status_code == 200, response.text
    assert isinstance(response.json(), list)


def test_crud_lifecycle(api: httpx.Client):
    # No 'name' field — key is the unique identifier.
    run_crud_lifecycle(
        api,
        path=PATH,
        name_field="key",
        create_body={
            "key": unique_key(32),
            "description": "E2E pilot record",
        },
        update_body={"description": "E2E pilot record updated"},
    )

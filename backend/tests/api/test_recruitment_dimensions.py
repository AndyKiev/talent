import httpx

from backend.tests.helpers.crud_lifecycle import run_crud_lifecycle
from backend.tests.helpers.unique_name import unique_name, unique_key

PATH = "/recruitment_dimensions"


def test_list_returns_rows(api: httpx.Client):
    response = api.get(PATH)
    assert response.status_code == 200, response.text
    assert isinstance(response.json(), list)


def test_crud_lifecycle(api: httpx.Client):
    run_crud_lifecycle(
        api,
        path=PATH,
        create_body={
            "name": unique_name("rdim", 128),
            "key": unique_key(64),
            "description": "E2E pilot record",
        },
        update_body={"description": "E2E pilot record updated"},
    )

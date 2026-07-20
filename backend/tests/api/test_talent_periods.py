import httpx

from backend.tests.helpers.crud_lifecycle import run_crud_lifecycle
from backend.tests.helpers.unique_name import unique_name

PATH = "/admin/talent_periods"


def test_list_returns_rows(api: httpx.Client):
    response = api.get(PATH)
    assert response.status_code == 200, response.text
    assert isinstance(response.json(), list)


def test_crud_lifecycle(api: httpx.Client):
    run_crud_lifecycle(
        api,
        path=PATH,
        # Talent limits: name max 32 (schema Field max_length)
        create_body={
            "name": unique_name("tp", 32),
            "qty_months": 12,
            "description": "E2E pilot record",
        },
        update_body={"description": "E2E pilot record updated"},
    )

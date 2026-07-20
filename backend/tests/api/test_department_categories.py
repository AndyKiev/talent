import httpx

from backend.tests.helpers.crud_lifecycle import run_crud_lifecycle
from backend.tests.helpers.unique_name import unique_name

PATH = "/admin/department_categories"


def test_list_returns_rows(api: httpx.Client):
    response = api.get(PATH)
    assert response.status_code == 200, response.text
    assert isinstance(response.json(), list)


def test_crud_lifecycle(api: httpx.Client):
    run_crud_lifecycle(
        api,
        path=PATH,
        create_body={
            "name": unique_name("dep_cat"),
            "description": "E2E pilot record",
            "is_active": False,
            "sort_order": 9999,
        },
        update_body={"description": "E2E pilot record updated"},
    )

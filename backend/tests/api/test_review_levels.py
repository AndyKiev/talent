import httpx

from backend.tests.helpers.crud_lifecycle import run_crud_lifecycle
from backend.tests.helpers.unique_name import unique_name

PATH = "/review_levels"


def test_list_returns_rows(api: httpx.Client):
    response = api.get(PATH)
    assert response.status_code == 200, response.text
    assert isinstance(response.json(), list)


def test_crud_lifecycle(api: httpx.Client):
    run_crud_lifecycle(
        api,
        path=PATH,
        # Review levels use name_key, not name.
        name_field="name_key",
        create_body={
            "name_key": unique_name("rlvl", 128),
            "description_key": unique_name("rlvl_desc", 128),
        },
        update_body={"description_key": unique_name("rlvl_upd", 128)},
    )

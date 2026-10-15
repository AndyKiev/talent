import httpx

from backend.tests.helpers.crud_lifecycle import run_crud_lifecycle
from backend.tests.helpers.unique_name import unique_name

PATH = "/admin/department_types"


def test_list_returns_rows(api: httpx.Client):
    response = api.get(PATH)
    assert response.status_code == 200, response.text
    assert isinstance(response.json(), list)


def test_crud_lifecycle(api: httpx.Client):
    run_crud_lifecycle(
        api,
        path=PATH,
        create_body={
            "name": unique_name("dept_type"),
            "description": "E2E pilot record",
        },
        update_body={"description": "E2E pilot record updated"},
    )


LINKS_PATH = "/admin/department_type_parental_links"


def test_parental_link_cycle_guard(api: httpx.Client):
    """A -> B -> C chain: linking A under C (or a type under itself, or
    re-pointing a link into its own subtree) is rejected with 400."""
    type_ids: list[int] = []
    link_ids: list[int] = []

    def create_type(slug: str) -> int:
        res = api.post(PATH, json={"name": unique_name(slug), "is_active": True})
        assert res.status_code == 201, res.text
        type_ids.append(res.json()["data"]["id"])
        return type_ids[-1]

    def link(child_id: int, parent_id: int) -> httpx.Response:
        res = api.post(LINKS_PATH, json={"child_id": child_id, "parent_id": parent_id})
        if res.status_code == 201:
            link_ids.append(res.json()["data"]["id"])
        return res

    try:
        a, b, c = create_type("cycle_a"), create_type("cycle_b"), create_type("cycle_c")
        assert link(b, a).status_code == 201
        res_cb = link(c, b)
        assert res_cb.status_code == 201
        c_under_b = res_cb.json()["data"]["id"]

        assert link(a, c).status_code == 400  # closes the loop
        assert link(a, a).status_code == 400  # self parent

        # Re-point C's link to C itself -> rejected; to A -> allowed.
        assert (
            api.patch(f"{LINKS_PATH}/{c_under_b}", json={"parent_id": c}).status_code
            == 400
        )
        moved = api.patch(f"{LINKS_PATH}/{c_under_b}", json={"parent_id": a})
        assert moved.status_code == 200, moved.text
    finally:
        for link_id in link_ids:
            api.delete(f"{LINKS_PATH}/{link_id}")
        for type_id in type_ids:
            api.delete(f"{PATH}/{type_id}")

"""Black-box API tests for the department job target essence.

Covers effective-dated planned headcount per department + job:
- feature gate (403 when headcount_plan_enabled is off)
- CRUD lifecycle (no GET by id exists – delete verification via list)
- uniqueness and type‑matching rules
- as-of resolution and has_plan
- count_by_link integrity

Requires the dev stack and ``headcount_plan_enabled = True``.
"""

import httpx
import pytest

URL_PREFIX = "/department_job_targets"


# ──────────────────────────────────────────────────────────────────────────────
#   guard fixture – skip the whole module when the feature is disabled
# ──────────────────────────────────────────────────────────────────────────────

@pytest.fixture(scope="module", autouse=True)
def _require_headcount_plan_enabled(api: httpx.Client) -> None:
    """Probe one endpoint; if it returns 403 the setting is off → skip module."""
    response = api.get(f"{URL_PREFIX}?department_id=1")
    if response.status_code == 403:
        pytest.skip(
            "headcount_plan_enabled is off – "
            "all department_job_targets endpoints return 403"
        )


# ──────────────────────────────────────────────────────────────────────────────
#   discovery fixtures (module‑scoped, read‑only)
# ──────────────────────────────────────────────────────────────────────────────

@pytest.fixture(scope="module")
def departments(api: httpx.Client) -> list[dict]:
    response = api.get("/departments")
    assert response.status_code == 200, response.text
    return response.json()


@pytest.fixture(scope="module")
def department_and_rows(api: httpx.Client, departments: list[dict]) -> tuple:
    """The first department whose TYPE actually carries job links.

    Taking departments[0] is not enough: the root department ('Рада
    директорів') has a type with no job links at all, so /calculate returns
    an empty list and every test below would skip — a green run asserting
    nothing. Scan until a usable department is found instead.
    """
    if not departments:
        pytest.skip("No departments exist in the environment")
    for dep in departments:
        response = api.get(
            f"{URL_PREFIX}/calculate"
            f"?department_id={dep['id']}&on_date=2099-01-01"
        )
        assert response.status_code == 200, response.text
        rows = response.json()
        if rows:
            return dep, rows
    pytest.skip("No department has any job link — cannot test targets")


@pytest.fixture(scope="module")
def department(department_and_rows: tuple) -> dict:
    return department_and_rows[0]


@pytest.fixture(scope="module")
def calculate_rows_for_department(department_and_rows: tuple) -> list[dict]:
    """All HeadcountCalcRows for the chosen department (far‑future date)."""
    return department_and_rows[1]


@pytest.fixture(scope="module")
def valid_link_id(calculate_rows_for_department: list[dict]) -> int:
    """A link_id that is valid for *department* (i.e. belongs to its type)."""
    return calculate_rows_for_department[0]["link_id"]


@pytest.fixture(scope="module")
def mismatched_department(
    departments: list[dict], department: dict
) -> dict | None:
    """A department whose type differs from *department*, or None."""
    dep_type = department["department_type_id"]
    for dep in departments:
        if dep["department_type_id"] != dep_type:
            return dep
    return None


@pytest.fixture(scope="module")
def link_id_with_no_plan(
    calculate_rows_for_department: list[dict],
) -> int:
    """A link_id for which no target exists (``has_plan == false``)."""
    for row in calculate_rows_for_department:
        if not row["has_plan"]:
            return row["link_id"]
    pytest.skip("Every job link already has a target – cannot test has_plan=false")


# ──────────────────────────────────────────────────────────────────────────────
#   helpers
# ──────────────────────────────────────────────────────────────────────────────

def _create(api: httpx.Client, payload: dict) -> dict:
    response = api.post(URL_PREFIX, json=payload)
    assert response.status_code == 201, response.text
    data = response.json()
    assert "data" in data, data
    return data["data"]


def _delete(api: httpx.Client, target_id: int) -> None:
    api.delete(f"{URL_PREFIX}/{target_id}")


# ──────────────────────────────────────────────────────────────────────────────
#   create
# ──────────────────────────────────────────────────────────────────────────────

@pytest.fixture
def cleanup_list(api: httpx.Client) -> list[int]:
    """Intra-test cleanup: delete ids appended here in a ``finally`` block."""
    ids: list[int] = []
    yield ids
    for tid in ids:
        _delete(api, tid)


def test_create_and_list(
    api: httpx.Client,
    department: dict,
    valid_link_id: int,
    cleanup_list: list[int],
) -> None:
    payload = {
        "department_id": department["id"],
        "department_type_job_link_id": valid_link_id,
        "qty": 42,
        "effective_date": "2099-01-01",
    }
    created = _create(api, payload)
    cleanup_list.append(created["id"])

    assert created["qty"] == 42, created
    assert created["effective_date"] == "2099-01-01", created
    assert isinstance(created["id"], int)
    assert created["created_by_name"], "created_by_name must be populated"

    # Verify presence in list
    response = api.get(
        f"{URL_PREFIX}?department_id={department['id']}"
        f"&department_type_job_link_id={valid_link_id}"
    )
    assert response.status_code == 200, response.text
    rows = response.json()
    ids = {r["id"] for r in rows}
    assert created["id"] in ids, f"Created target missing from list: {rows}"


def test_create_returns_201_and_envelope(
    api: httpx.Client, department: dict, valid_link_id: int, cleanup_list: list[int]
) -> None:
    payload = {
        "department_id": department["id"],
        "department_type_job_link_id": valid_link_id,
        "qty": 3,
        "effective_date": "2099-02-01",
    }
    response = api.post(URL_PREFIX, json=payload)
    assert response.status_code == 201, response.text
    body = response.json()
    assert "detail" in body, body
    assert "data" in body, body
    cleanup_list.append(body["data"]["id"])


# ──────────────────────────────────────────────────────────────────────────────
#   uniqueness / duplicates
# ──────────────────────────────────────────────────────────────────────────────

def test_duplicate_triple_rejected(
    api: httpx.Client, department: dict, valid_link_id: int, cleanup_list: list[int]
) -> None:
    payload = {
        "department_id": department["id"],
        "department_type_job_link_id": valid_link_id,
        "qty": 5,
        "effective_date": "2099-03-15",
    }
    first = _create(api, payload)
    cleanup_list.append(first["id"])

    # same triple → 400
    # Same triple → 400. The detail text is resolved from the DB translation
    # table, so it is asserted on the status only — matching English wording
    # would break the moment the message is translated.
    response = api.post(URL_PREFIX, json=payload)
    assert response.status_code == 400, response.text


# ──────────────────────────────────────────────────────────────────────────────
#   department / link existence
# ──────────────────────────────────────────────────────────────────────────────

def test_unknown_department_id(api: httpx.Client, valid_link_id: int) -> None:
    response = api.post(
        URL_PREFIX,
        json={
            "department_id": 99999999,
            "department_type_job_link_id": valid_link_id,
            "qty": 1,
            "effective_date": "2099-01-01",
        },
    )
    assert response.status_code == 404, response.text


def test_unknown_link_id(api: httpx.Client, department: dict) -> None:
    response = api.post(
        URL_PREFIX,
        json={
            "department_id": department["id"],
            "department_type_job_link_id": 99999999,
            "qty": 1,
            "effective_date": "2099-01-01",
        },
    )
    assert response.status_code == 404, response.text


# ──────────────────────────────────────────────────────────────────────────────
#   type mismatch
# ──────────────────────────────────────────────────────────────────────────────

def test_type_mismatch(
    api: httpx.Client,
    department: dict,
    valid_link_id: int,
    mismatched_department: dict | None,
    cleanup_list: list[int],
) -> None:
    if mismatched_department is None:
        pytest.skip("No department with a different department_type_id exists")
    payload = {
        "department_id": mismatched_department["id"],
        "department_type_job_link_id": valid_link_id,  # belongs to other type
        "qty": 7,
        "effective_date": "2099-04-01",
    }
    response = api.post(URL_PREFIX, json=payload)
    assert response.status_code == 400, response.text
    # ensure nothing was persisted
    list_resp = api.get(
        f"{URL_PREFIX}?department_id={mismatched_department['id']}"
        f"&department_type_job_link_id={valid_link_id}"
    )
    assert list_resp.status_code == 200, list_resp.text
    assert list_resp.json() == [], "Mismatched row leaked into database"


# ──────────────────────────────────────────────────────────────────────────────
#   negative quantity → 422
# ──────────────────────────────────────────────────────────────────────────────

def test_create_negative_qty_is_422(
    api: httpx.Client, department: dict, valid_link_id: int
) -> None:
    response = api.post(
        URL_PREFIX,
        json={
            "department_id": department["id"],
            "department_type_job_link_id": valid_link_id,
            "qty": -1,
            "effective_date": "2099-01-01",
        },
    )
    assert response.status_code == 422, response.text


# ──────────────────────────────────────────────────────────────────────────────
#   patch
# ──────────────────────────────────────────────────────────────────────────────

def test_patch_changes_qty(
    api: httpx.Client, department: dict, valid_link_id: int, cleanup_list: list[int]
) -> None:
    created = _create(
        api,
        {
            "department_id": department["id"],
            "department_type_job_link_id": valid_link_id,
            "qty": 10,
            "effective_date": "2099-02-10",
        },
    )
    cleanup_list.append(created["id"])

    # PATCH with a different quantity (effective_date must also be sent)
    patch_resp = api.patch(
        f"{URL_PREFIX}/{created['id']}",
        json={"qty": 20, "effective_date": "2099-02-10"},
    )
    assert patch_resp.status_code == 200, patch_resp.text
    patched = patch_resp.json()["data"]
    assert patched["qty"] == 20, patched

    # verify via list
    list_resp = api.get(
        f"{URL_PREFIX}?department_id={department['id']}"
        f"&department_type_job_link_id={valid_link_id}"
    )
    assert list_resp.status_code == 200, list_resp.text
    row = next(r for r in list_resp.json() if r["id"] == created["id"])
    assert row["qty"] == 20, row


def test_patch_onto_occupied_date(
    api: httpx.Client, department: dict, valid_link_id: int, cleanup_list: list[int]
) -> None:
    first = _create(
        api,
        {
            "department_id": department["id"],
            "department_type_job_link_id": valid_link_id,
            "qty": 1,
            "effective_date": "2099-05-01",
        },
    )
    second = _create(
        api,
        {
            "department_id": department["id"],
            "department_type_job_link_id": valid_link_id,
            "qty": 1,
            "effective_date": "2099-06-01",
        },
    )
    cleanup_list.extend([first["id"], second["id"]])

    # Move the second onto the first’s date → conflict
    response = api.patch(
        f"{URL_PREFIX}/{second['id']}",
        json={"qty": 99, "effective_date": "2099-05-01"},
    )
    # Status only: `detail` comes from the DB translation table and is
    # Ukrainian in a seeded environment.
    assert response.status_code == 400, response.text


def test_patch_negative_qty_is_422(
    api: httpx.Client, department: dict, valid_link_id: int, cleanup_list: list[int]
) -> None:
    created = _create(
        api,
        {
            "department_id": department["id"],
            "department_type_job_link_id": valid_link_id,
            "qty": 3,
            "effective_date": "2099-07-01",
        },
    )
    cleanup_list.append(created["id"])

    # Must send a valid effective_date as well; -1 for qty
    response = api.patch(
        f"{URL_PREFIX}/{created['id']}",
        json={"qty": -1, "effective_date": "2099-07-01"},
    )
    assert response.status_code == 422, response.text


def test_patch_refreshes_authorship(
    api: httpx.Client, department: dict, valid_link_id: int, cleanup_list: list[int]
) -> None:
    created = _create(
        api,
        {
            "department_id": department["id"],
            "department_type_job_link_id": valid_link_id,
            "qty": 5,
            "effective_date": "2099-08-01",
        },
    )
    cleanup_list.append(created["id"])
    original_created_at = created["created_at"]

    patched = api.patch(
        f"{URL_PREFIX}/{created['id']}",
        json={"qty": 6, "effective_date": "2099-08-01"},
    ).json()["data"]

    # authored by the editing user (admin), so name stays populated;
    # the timestamp must have been refreshed.
    assert patched["created_by_name"], "created_by_name missing after patch"
    assert patched["created_at"] != original_created_at, "created_at not refreshed"


# ──────────────────────────────────────────────────────────────────────────────
#   delete (verification via list)
# ──────────────────────────────────────────────────────────────────────────────

def test_delete_removes_row(
    api: httpx.Client, department: dict, valid_link_id: int
) -> None:
    created = _create(
        api,
        {
            "department_id": department["id"],
            "department_type_job_link_id": valid_link_id,
            "qty": 2,
            "effective_date": "2099-09-01",
        },
    )
    tid = created["id"]

    del_resp = api.delete(f"{URL_PREFIX}/{tid}")
    assert del_resp.status_code == 200, del_resp.text

    # Assert absent from list (NOT by fetching by id)
    list_resp = api.get(
        f"{URL_PREFIX}?department_id={department['id']}"
        f"&department_type_job_link_id={valid_link_id}"
    )
    assert list_resp.status_code == 200, list_resp.text
    ids = {r["id"] for r in list_resp.json()}
    assert tid not in ids, f"Deleted target {tid} still in list: {list_resp.json()}"


# ──────────────────────────────────────────────────────────────────────────────
#   as‑of resolution
# ──────────────────────────────────────────────────────────────────────────────

def test_as_of_resolution(
    api: httpx.Client, department: dict, valid_link_id: int, cleanup_list: list[int]
) -> None:
    # Create two targets for the same link, separated in time
    first = _create(
        api,
        {
            "department_id": department["id"],
            "department_type_job_link_id": valid_link_id,
            "qty": 10,
            "effective_date": "2099-01-01",
        },
    )
    second = _create(
        api,
        {
            "department_id": department["id"],
            "department_type_job_link_id": valid_link_id,
            "qty": 20,
            "effective_date": "2099-06-01",
        },
    )
    cleanup_list.extend([first["id"], second["id"]])

    dep_id = department["id"]

    # Date before second target → plan_qty = 10
    resp = api.get(
        f"{URL_PREFIX}/calculate?department_id={dep_id}&on_date=2099-03-01"
    )
    assert resp.status_code == 200, resp.text
    row = next(r for r in resp.json() if r["link_id"] == valid_link_id)
    assert row["plan_qty"] == 10, row

    # Date after second target → plan_qty = 20
    resp = api.get(
        f"{URL_PREFIX}/calculate?department_id={dep_id}&on_date=2099-07-01"
    )
    assert resp.status_code == 200, resp.text
    row = next(r for r in resp.json() if r["link_id"] == valid_link_id)
    assert row["plan_qty"] == 20, row


# ──────────────────────────────────────────────────────────────────────────────
#   has_plan = false
# ──────────────────────────────────────────────────────────────────────────────

def test_has_plan_false_when_no_target(
    api: httpx.Client, department: dict, link_id_with_no_plan: int
) -> None:
    dep_id = department["id"]
    resp = api.get(
        f"{URL_PREFIX}/calculate?department_id={dep_id}&on_date=2099-01-01"
    )
    assert resp.status_code == 200, resp.text
    row = next(
        r for r in resp.json() if r["link_id"] == link_id_with_no_plan
    )
    assert row["has_plan"] is False, row


# ──────────────────────────────────────────────────────────────────────────────
#   count_by_link
# ──────────────────────────────────────────────────────────────────────────────

def test_count_by_link_increases_and_reverts(
    api: httpx.Client, department: dict, valid_link_id: int
) -> None:
    # initial count
    initial_resp = api.get(f"{URL_PREFIX}/count_by_link/{valid_link_id}")
    assert initial_resp.status_code == 200, initial_resp.text
    initial_count = initial_resp.json()["count"]
    assert isinstance(initial_count, int)

    # create one target
    created = _create(
        api,
        {
            "department_id": department["id"],
            "department_type_job_link_id": valid_link_id,
            "qty": 1,
            "effective_date": "2099-11-11",
        },
    )
    try:
        # after create +1
        resp = api.get(f"{URL_PREFIX}/count_by_link/{valid_link_id}")
        assert resp.status_code == 200, resp.text
        assert resp.json()["count"] == initial_count + 1, resp.json()
    finally:
        _delete(api, created["id"])

    # after delete, back to original
    final_resp = api.get(f"{URL_PREFIX}/count_by_link/{valid_link_id}")
    assert final_resp.status_code == 200, final_resp.text
    assert final_resp.json()["count"] == initial_count, final_resp.json()

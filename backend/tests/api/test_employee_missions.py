"""Black-box API tests for the employee-scoped development plan.

Covers the invariants that are NOT expressible in the schema and therefore live
in service code — the mandatory-KPI rule, the derived end_date, the app-setting
duration bound — plus the permission matrix, which is the highest-value part:
missions are written only by the employee's oversight manager (or admin), while
the employee themselves is read-only and writes through comments / the vision.

Requires the dev stack (/start1) and the mission tables migration.
"""

import datetime

import httpx
import pytest

# The current-user endpoint lives under the JWT router prefix.
ME_PATH = "/jwt/users/me"

MISSIONS = "/employee_missions"
KPIS = "/employee_mission_kpis"
COMMENTS = "/employee_mission_comments"
VISIONS = "/employee_development_visions"
DIMENSION_LINKS = "/employee_mission_dimension_links"

ADMIN_CODE = "UKR7101004"


# ── fixtures ────────────────────────────────────────────────────────────────


@pytest.fixture(scope="module")
def admin_employee_id(api: httpx.Client) -> int:
    response = api.get(ME_PATH)
    assert response.status_code == 200, response.text
    return response.json()["id"]


@pytest.fixture(scope="module")
def subject_employee_id(api: httpx.Client, admin_employee_id: int) -> int:
    """Some employee OTHER than the admin, used as the plan owner."""
    response = api.get("/employees")
    assert response.status_code == 200, response.text
    rows = response.json()
    others = [r["id"] for r in rows if r["id"] != admin_employee_id]
    if not others:
        pytest.skip("Needs at least one non-admin employee")
    return others[0]


@pytest.fixture(scope="module")
def subject_client(base_url: str, api: httpx.Client, subject_employee_id: int):
    """A client authenticated AS the plan's own employee.

    `BYPASS_LDAP` only skips PASSWORD validation at login — it does not grant
    permissions, which come from group membership (`UserGroup.is_bypass` via
    resolve_user_is_bypass). So logging in as a plain employee really does yield
    a non-privileged token.

    But the subject is picked as "first employee that is not the admin", and that
    employee COULD happen to sit in a bypass group — in which case every 403
    assertion below would silently become a 200 and the matrix would be theatre.
    `can_access_test` on /jwt/users/me mirrors the real bypass flag, so check it and
    skip loudly rather than assert something meaningless.
    """
    row = api.get(f"/employees/{subject_employee_id}").json()
    response = httpx.post(
        f"{base_url}/jwt/login",
        data={"username": row["code"], "password": "e2e"},
        timeout=10,
    )
    if response.status_code != 200:
        pytest.skip("Cannot log in as a plain employee (LDAP bypass off?)")
    token = response.json()["access_token"]
    with httpx.Client(
        base_url=base_url,
        headers={"Authorization": f"Bearer {token}"},
        timeout=30,
    ) as client:
        me = client.get(ME_PATH)
        assert me.status_code == 200, me.text
        if me.json().get("can_access_test"):
            pytest.skip(
                f"Subject employee {row['code']} is a bypass user — "
                "the permission assertions would pass vacuously"
            )
        yield client


@pytest.fixture
def mission(api: httpx.Client, subject_employee_id: int):
    """A mission with one KPI, removed again afterwards."""
    payload = {
        "text": "API test mission",
        "start_date": "2026-01-31",
        "duration_months": 1,
        "kpis": [{"text": "API test KPI"}],
    }
    response = api.post(f"{MISSIONS}/employee/{subject_employee_id}", json=payload)
    assert response.status_code == 200, response.text
    record = response.json()["data"]
    try:
        yield record
    finally:
        api.delete(f"{MISSIONS}/{record['id']}")


# ── derived end_date ────────────────────────────────────────────────────────


def test_end_date_is_derived_not_supplied(mission):
    # 31 Jan + 1 month must clamp to the end of February, which plain day
    # arithmetic (timedelta) would get wrong.
    assert mission["end_date"] == "2026-02-28"


def test_end_date_recomputed_on_duration_change(api: httpx.Client, mission):
    response = api.patch(f"{MISSIONS}/{mission['id']}", json={"duration_months": 12})
    assert response.status_code == 200, response.text
    assert response.json()["data"]["end_date"] == "2027-01-31"


def test_end_date_ignores_client_supplied_value(api: httpx.Client, mission):
    # end_date is not in the update schema, so sending it must not take effect.
    response = api.patch(f"{MISSIONS}/{mission['id']}", json={"end_date": "2099-01-01"})
    assert response.status_code in (200, 422), response.text
    if response.status_code == 200:
        assert response.json()["data"]["end_date"] == mission["end_date"]


# ── duration bound (app setting, not a DB CHECK) ────────────────────────────


@pytest.mark.parametrize("months", [0, -1, 37, 999])
def test_duration_out_of_range_rejected(
    api: httpx.Client, subject_employee_id: int, months: int
):
    response = api.post(
        f"{MISSIONS}/employee/{subject_employee_id}",
        json={
            "text": "bad duration",
            "start_date": "2026-01-01",
            "duration_months": months,
            "kpis": [{"text": "k"}],
        },
    )
    assert response.status_code in (400, 422), response.text


# ── mandatory KPI (two-sided rule) ──────────────────────────────────────────


def test_create_without_kpi_rejected(api: httpx.Client, subject_employee_id: int):
    response = api.post(
        f"{MISSIONS}/employee/{subject_employee_id}",
        json={
            "text": "no kpis",
            "start_date": "2026-01-01",
            "duration_months": 6,
            "kpis": [],
        },
    )
    assert response.status_code == 422, response.text


def test_cannot_delete_last_kpi(api: httpx.Client, mission):
    kpi_id = mission["kpis"][0]["id"]
    response = api.delete(f"{KPIS}/{kpi_id}")
    assert response.status_code == 400, response.text


def test_can_delete_kpi_when_another_remains(api: httpx.Client, mission):
    added = api.post(f"{KPIS}/mission/{mission['id']}", json={"text": "second"})
    assert added.status_code == 200, added.text
    response = api.delete(f"{KPIS}/{added.json()['data']['id']}")
    assert response.status_code == 200, response.text


# ── fulfilment percent ──────────────────────────────────────────────────────


@pytest.mark.parametrize("percent", [-1, 101, 1000])
def test_percent_out_of_range_rejected(api: httpx.Client, mission, percent: int):
    kpi_id = mission["kpis"][0]["id"]
    response = api.patch(f"{KPIS}/{kpi_id}", json={"percent": percent})
    assert response.status_code in (400, 422), response.text


def test_percent_change_is_recorded_in_history(api: httpx.Client, mission):
    kpi_id = mission["kpis"][0]["id"]
    updated = api.patch(f"{KPIS}/{kpi_id}", json={"percent": 60})
    assert updated.status_code == 200, updated.text
    assert updated.json()["data"]["percent"] == 60

    history = api.get(f"{MISSIONS}/{mission['id']}/history")
    assert history.status_code == 200, history.text
    entries = history.json()
    percent_entries = [
        e
        for e in entries
        if e["entity_kind"] == "employee_mission_kpi"
        and e["entity_id"] == kpi_id
        and (e["changes"] or {}).get("percent")
    ]
    assert percent_entries, f"No percent change logged: {entries}"
    change = percent_entries[0]["changes"]["percent"]
    assert change["old"] == 0 and change["new"] == 60
    assert percent_entries[0]["actor_name"], "History entry has no actor"


# ── competence link (optional 1:1) ──────────────────────────────────────────


def test_dimension_link_set_and_clear(api: httpx.Client, mission):
    dimensions = api.get("/review_dimensions").json()
    if not dimensions:
        pytest.skip("No review dimensions seeded")
    dimension_id = dimensions[0]["id"]

    linked = api.put(
        f"{DIMENSION_LINKS}/mission/{mission['id']}",
        json={"dimension_id": dimension_id},
    )
    assert linked.status_code == 200, linked.text

    # Upsert, not a second row: setting again must still leave exactly one link.
    again = api.put(
        f"{DIMENSION_LINKS}/mission/{mission['id']}",
        json={"dimension_id": dimension_id},
    )
    assert again.status_code == 200, again.text

    fetched = api.get(f"{DIMENSION_LINKS}/mission/{mission['id']}").json()
    assert fetched is not None and fetched["dimension_id"] == dimension_id

    cleared = api.delete(f"{DIMENSION_LINKS}/mission/{mission['id']}")
    assert cleared.status_code == 200, cleared.text
    assert api.get(f"{DIMENSION_LINKS}/mission/{mission['id']}").json() is None


# ── cascade ─────────────────────────────────────────────────────────────────


def test_deleting_mission_cascades_kpis(api: httpx.Client, subject_employee_id: int):
    created = api.post(
        f"{MISSIONS}/employee/{subject_employee_id}",
        json={
            "text": "cascade probe",
            "start_date": "2026-03-01",
            "duration_months": 3,
            "kpis": [{"text": "k1"}, {"text": "k2"}],
        },
    )
    assert created.status_code == 200, created.text
    record = created.json()["data"]
    kpi_id = record["kpis"][0]["id"]

    assert api.delete(f"{MISSIONS}/{record['id']}").status_code == 200
    # The KPI is gone with its mission, so touching it must 404, not 200.
    assert api.patch(f"{KPIS}/{kpi_id}", json={"percent": 10}).status_code == 404


# ── permission matrix ───────────────────────────────────────────────────────


def test_employee_can_read_own_missions(
    subject_client: httpx.Client, subject_employee_id: int, mission
):
    response = subject_client.get(f"{MISSIONS}/employee/{subject_employee_id}")
    assert response.status_code == 200, response.text
    assert any(m["id"] == mission["id"] for m in response.json())


def test_employee_cannot_edit_own_mission(subject_client: httpx.Client, mission):
    """The core of the new ownership model: the plan is ABOUT the employee but
    written by their oversight manager."""
    response = subject_client.patch(
        f"{MISSIONS}/{mission['id']}", json={"text": "self-edited"}
    )
    assert response.status_code == 403, response.text


def test_employee_cannot_set_own_kpi_percent(subject_client: httpx.Client, mission):
    kpi_id = mission["kpis"][0]["id"]
    response = subject_client.patch(f"{KPIS}/{kpi_id}", json={"percent": 100})
    assert response.status_code == 403, response.text


def test_employee_cannot_delete_own_mission(subject_client: httpx.Client, mission):
    response = subject_client.delete(f"{MISSIONS}/{mission['id']}")
    assert response.status_code == 403, response.text


def test_employee_can_comment_on_own_mission(subject_client: httpx.Client, mission):
    """Comments are the employee's write surface, unlike the mission itself."""
    response = subject_client.post(
        f"{COMMENTS}/mission/{mission['id']}", json={"text": "my comment"}
    )
    assert response.status_code == 200, response.text
    comment_id = response.json()["data"]["id"]
    assert subject_client.delete(f"{COMMENTS}/{comment_id}").status_code == 200


def test_employee_can_save_own_development_vision(
    subject_client: httpx.Client, subject_employee_id: int
):
    response = subject_client.put(
        f"{VISIONS}/employee/{subject_employee_id}",
        json={"text": "I want to grow into a lead role."},
    )
    assert response.status_code == 200, response.text
    fetched = subject_client.get(f"{VISIONS}/employee/{subject_employee_id}").json()
    assert fetched["text"] == "I want to grow into a lead role."


def test_vision_survives_repeated_edits(
    subject_client: httpx.Client, subject_employee_id: int
):
    """Regression: the SECOND save (a real UPDATE, not the initial insert) used
    to 500.

    `updated_at` is `onupdate=func.now()`, so after an UPDATE flush the attribute
    is expired; serializing it then lazy-loaded outside the async greenlet. The
    insert path hid the bug because Postgres returns server defaults via
    RETURNING. Each PUT here must change the text, or SQLAlchemy emits no UPDATE
    and the regression goes undetected.
    """
    seen = set()
    for n in range(3):
        response = subject_client.put(
            f"{VISIONS}/employee/{subject_employee_id}",
            json={"text": f"vision revision {n}"},
        )
        assert response.status_code == 200, f"save #{n + 1}: {response.text}"
        data = response.json()["data"]
        assert data["text"] == f"vision revision {n}"
        seen.add(data["updated_at"])
    assert len(seen) > 1, "updated_at never advanced across real edits"


def test_employee_cannot_write_another_employees_vision(
    subject_client: httpx.Client, admin_employee_id: int
):
    response = subject_client.put(
        f"{VISIONS}/employee/{admin_employee_id}", json={"text": "not mine"}
    )
    assert response.status_code == 403, response.text


def test_standalone_comment_read_is_scoped(
    api: httpx.Client, subject_client: httpx.Client, admin_employee_id: int
):
    """GET /employee_mission_comments/mission/{id} is keyed by mission_id, so no
    route guard can see an employee_id — the service must scope it. Without that
    check any logged-in user could walk sequential ids and read anyone's plan
    comments, which are the most private content in this feature.
    """
    created = api.post(
        f"{MISSIONS}/employee/{admin_employee_id}",
        json={
            "text": "admin's own mission",
            "start_date": "2026-01-01",
            "duration_months": 6,
            "kpis": [{"text": "k"}],
        },
    )
    if created.status_code != 200:
        pytest.skip("Admin cannot hold a mission in this configuration")
    mission_id = created.json()["data"]["id"]
    try:
        response = subject_client.get(f"{COMMENTS}/mission/{mission_id}")
        assert response.status_code == 403, (
            "A plain employee read another employee's mission comments "
            f"(status {response.status_code})"
        )
    finally:
        api.delete(f"{MISSIONS}/{mission_id}")


def test_admin_has_full_crud(api: httpx.Client, subject_employee_id: int):
    created = api.post(
        f"{MISSIONS}/employee/{subject_employee_id}",
        json={
            "text": "admin lifecycle",
            "start_date": datetime.date.today().isoformat(),
            "duration_months": 6,
            "kpis": [{"text": "k"}],
        },
    )
    assert created.status_code == 200, created.text
    mission_id = created.json()["data"]["id"]

    patched = api.patch(f"{MISSIONS}/{mission_id}", json={"text": "admin edited"})
    assert patched.status_code == 200, patched.text
    assert patched.json()["data"]["text"] == "admin edited"

    assert api.delete(f"{MISSIONS}/{mission_id}").status_code == 200


# ── ordering ────────────────────────────────────────────────────────────────


def test_missions_are_returned_newest_first(
    api: httpx.Client, subject_employee_id: int
):
    ids = []
    try:
        for start in ("2025-01-01", "2027-01-01"):
            response = api.post(
                f"{MISSIONS}/employee/{subject_employee_id}",
                json={
                    "text": f"order probe {start}",
                    "start_date": start,
                    "duration_months": 6,
                    "kpis": [{"text": "k"}],
                },
            )
            assert response.status_code == 200, response.text
            ids.append(response.json()["data"]["id"])

        rows = api.get(f"{MISSIONS}/employee/{subject_employee_id}").json()
        starts = [r["start_date"] for r in rows]
        assert starts == sorted(starts, reverse=True), starts
    finally:
        for mission_id in ids:
            api.delete(f"{MISSIONS}/{mission_id}")

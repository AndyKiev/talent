"""Black-box API tests for the talent employees roster
(GET /talent_audits/roster + /talent_audits/roster_options).

Read-only: nothing is created or mutated. Assertions hold for any data set —
they check paging, the has_talent split and the main-talent ordering rule.
"""

import httpx
import pytest

PATH = "/talent_audits/roster"


def _roster(api: httpx.Client, **params) -> dict:
    response = api.get(PATH, params=params)
    assert response.status_code == 200, response.text
    body = response.json()
    assert set(body) == {"items", "total"}
    return body


def test_options_shape(api: httpx.Client):
    response = api.get("/talent_audits/roster_options")
    assert response.status_code == 200, response.text
    assert set(response.json()) == {
        "employees",
        "departments",
        "jobs",
        "statuses",
        "talent_statuses",
        "talent_periods",
    }


def test_has_talent_split_adds_up(api: httpx.Client):
    everyone = _roster(api, page_size=1)["total"]
    with_talent = _roster(api, page_size=1, has_talent=True)["total"]
    without = _roster(api, page_size=1, has_talent=False)["total"]
    assert with_talent + without == everyone


def test_with_talent_rows_have_main_talent_first(api: httpx.Client):
    for row in _roster(api, page_size=50, has_talent=True)["items"]:
        talents = row["talents"]
        assert talents, row
        months = [t["qty_months"] for t in talents]
        assert months == sorted(months), "talents[0] must be the closest period"


def test_without_talent_rows_have_no_talents(api: httpx.Client):
    for row in _roster(api, page_size=50, has_talent=False)["items"]:
        assert row["talents"] == []


def test_paging_respects_page_size(api: httpx.Client):
    body = _roster(api, page_size=2)
    assert len(body["items"]) <= 2
    if body["total"] > 2:
        second = _roster(api, page_size=2, page=1)
        first_ids = {r["employee_id"] for r in body["items"]}
        assert first_ids.isdisjoint(r["employee_id"] for r in second["items"])


def test_talent_period_filter_matches_any_talent(api: httpx.Client):
    periods = api.get("/talent_audits/roster_options").json()["talent_periods"]
    if not periods:
        pytest.skip("No active talent periods to filter by")
    period_id = periods[0]["id"]
    for row in _roster(api, page_size=50, talent_period_id=period_id)["items"]:
        assert any(t["talent_period_id"] == period_id for t in row["talents"])

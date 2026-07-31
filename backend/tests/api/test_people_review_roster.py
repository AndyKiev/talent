"""Regression tests for the people-review roster and detail endpoints.

These exist because of one specific bug class. `Employee.name` has no column
behind it — it composes the person's parts — and the people-review queries
deliberately `raiseload("*")` the employee graph to avoid an N+1 explosion.
The moment the name became a property, both endpoints started returning 500:

    InvalidRequestError: 'Employee.person' is not available due to lazy='raise'

Nothing caught it, because the failure needs a real query with real loader
options; an in-process call through a fresh service loads `person` happily.
The same applies to `birth_date` / `sex` / `marital_status`, which are also
person proxies, and which the DETAIL path reads.

So: assert the endpoints answer 200 AND that the person-derived fields actually
arrive. A 200 with a blank name would mean `person` came back unloaded, which is
the same bug wearing a disguise.
"""

import httpx
import pytest

SESSIONS = "/review_sessions"
ROSTER = "/review_session_employees"


@pytest.fixture
def session_with_roster(api: httpx.Client) -> int:
    """A review session that actually has employees on it.

    Scans rather than taking [0]: sessions are routinely created empty, and the
    first one being empty would make every test here skip while pytest still
    exits 0 — a green run that asserted nothing.

    A non-200 from the roster is a FAILURE, never a reason to move on to the
    next session. Skipping on it is how this fixture originally hid the exact
    500 these tests exist to catch: every session errored, none "qualified",
    and the run came back green with two skips.
    """
    resp = api.get(SESSIONS)
    assert resp.status_code == 200, resp.text
    for session in resp.json():
        roster = api.get(ROSTER, params={"session_id": session["id"]})
        assert roster.status_code == 200, (
            f"roster for session {session['id']} returned "
            f"{roster.status_code}: {roster.text}"
        )
        if roster.json():
            return session["id"]
    pytest.skip("No review session has any employees on its roster")


def test_roster_loads_and_composes_names(api: httpx.Client, session_with_roster: int):
    """The roster raiseloads the employee graph — the composed name must still
    resolve, which means `person` has to be in the loader options."""
    resp = api.get(ROSTER, params={"session_id": session_with_roster})
    assert resp.status_code == 200, resp.text
    rows = resp.json()
    assert rows, "fixture guarantees a non-empty roster"
    for row in rows:
        assert row["employee_code"], f"row {row['id']} has no employee code"
        # The real assertion: a blank name means person came back unloaded.
        assert row["employee_name"], (
            f"row {row['id']} has an empty employee_name — Employee.person was "
            "probably not loaded by the roster query"
        )


def test_detail_loads_person_derived_facts(api: httpx.Client, session_with_roster: int):
    """The detail path reads four person proxies (name, birth_date, sex,
    marital_status). It must not raise, and the name must be populated."""
    rows = api.get(ROSTER, params={"session_id": session_with_roster}).json()
    resp = api.get(f"{ROSTER}/{rows[0]['id']}")
    assert resp.status_code == 200, resp.text
    detail = resp.json()
    assert detail["employee_name"], "employee_name empty — person not loaded"
    assert detail["employee_code"]
    # birth_date / sex / marital_status are nullable in the data, so their VALUE
    # cannot be asserted — but reading them must not have raised, and reaching
    # this line proves it did not.
    assert "birth_date" in detail
    assert "sex" in detail

"""Black-box API tests for the person_events module.

Covers creation (draft, name normalisation), state-machine lifecycle,
apply_due bulk process, deletion rules and the female‑only sex guard.

All tests hit the running dev stack and mutate only what they clean up.
"""

import datetime
from typing import Union

import httpx
import pytest
from backend.tests.helpers.unique_name import unique_name

# ---------------------------------------------------------------------------
# Fixtures that discover a usable person and temporarily set the required sex.
# ---------------------------------------------------------------------------

BASE_PERSON_PATH = "/persons/{person_id}"
PERSON_EVENTS = "/person_events"


def _get_person_sex(api: httpx.Client, person_id: int) -> Union[str, None]:
    person = api.get(BASE_PERSON_PATH.format(person_id=person_id))
    assert person.status_code == 200, person.text
    return person.json().get("sex")


def _patch_sex(api: httpx.Client, person_id: int, sex: Union[str, None]) -> None:
    body = {"sex": sex, "allow_duplicate": True}
    resp = api.patch(BASE_PERSON_PATH.format(person_id=person_id), json=body)
    assert resp.status_code in (200, 204), resp.text


# ---------------------------------------------------------------------------
# Discovery – SCAN, do NOT blindly take [0].
# ---------------------------------------------------------------------------

@pytest.fixture
def discovered_person_id(api: httpx.Client) -> int:
    """Iterate over employees, pick the first one whose person record is reachable."""
    resp = api.get("/employees")
    assert resp.status_code == 200, resp.text
    employees = resp.json()
    if not employees:
        pytest.skip("No employees seeded – cannot test person_events")
    for emp in employees:
        person_id = emp["person_id"]
        # Ensure the person actually exists.
        get_resp = api.get(BASE_PERSON_PATH.format(person_id=person_id))
        if get_resp.status_code == 200:
            return person_id
    pytest.skip("No valid person found among employees")


# ---------------------------------------------------------------------------
# Sex helpers that restore the original value after the test.
# ---------------------------------------------------------------------------

@pytest.fixture
def female_person_id(api: httpx.Client, discovered_person_id: int) -> int:
    """The discovered person, temporarily set to sex='female'."""
    person_id = discovered_person_id
    original = _get_person_sex(api, person_id)
    if original != "female":
        _patch_sex(api, person_id, "female")
    try:
        yield person_id
    finally:
        _patch_sex(api, person_id, original)


@pytest.fixture
def male_person_id(api: httpx.Client, discovered_person_id: int) -> int:
    """The discovered person, temporarily set to sex='male'."""
    person_id = discovered_person_id
    original = _get_person_sex(api, person_id)
    if original != "male":
        _patch_sex(api, person_id, "male")
    try:
        yield person_id
    finally:
        _patch_sex(api, person_id, original)


@pytest.fixture
def no_sex_person_id(api: httpx.Client, discovered_person_id: int) -> int:
    """The discovered person, temporarily set to sex=None."""
    person_id = discovered_person_id
    original = _get_person_sex(api, person_id)
    if original is not None:
        _patch_sex(api, person_id, None)
    try:
        yield person_id
    finally:
        _patch_sex(api, person_id, original)


@pytest.fixture
def preserved_last_name(api: httpx.Client, female_person_id: int) -> str:
    """Yield the person's current surname and put it back on teardown.

    These tests run against the seeded dev database, not a throwaway one, and
    applying an event really does rename someone. Restoring inline at the end of
    a test is not enough: the first failed assertion skips the restore and leaves
    a made-up surname on a real person. A fixture teardown always runs.
    """
    person_url = BASE_PERSON_PATH.format(person_id=female_person_id)
    original = api.get(person_url).json()["last_name"]
    try:
        yield original
    finally:
        api.patch(person_url, json={"last_name": original, "allow_duplicate": True})


# ---------------------------------------------------------------------------
# Helper: create an event and clean it up.
# ---------------------------------------------------------------------------

def _create_event(api: httpx.Client, person_id: int, new_last_name: str,
                  effective_date: str, description: Union[str, None] = None) -> dict:
    """Create a last_name_change event for *person_id* and return its `data`."""
    body = {"new_last_name": new_last_name, "effective_date": effective_date}
    if description is not None:
        body["description"] = description
    resp = api.post(f"{PERSON_EVENTS}/by_person/{person_id}/last_name_change",
                    json=body)
    assert resp.status_code == 201, resp.text
    payload = resp.json()
    assert "data" in payload
    return payload["data"]


def _delete_event_safe(api: httpx.Client, event_id: int) -> None:
    """Delete *event_id*, swallowing failures for non‑deletable states."""
    resp = api.delete(f"{PERSON_EVENTS}/{event_id}")
    if resp.status_code not in (200, 204, 400, 404):
        raise AssertionError(f"Unexpected delete response: {resp.status_code} {resp.text}")


# ---------------------------------------------------------------------------
# 1. Creation makes a DRAFT
# ---------------------------------------------------------------------------

def test_create_is_draft(api: httpx.Client, female_person_id: int):
    event = _create_event(api, female_person_id,
                          unique_name("Testova"),
                          effective_date="2026-01-01")
    try:
        assert event["status"]["name"] == "draft"
        assert event["allowed_targets"] == ["ready"]
        changes = event["changes"]
        assert len(changes) == 1
        assert changes[0]["field_key"] == "last_name"
    finally:
        _delete_event_safe(api, event["id"])


# ---------------------------------------------------------------------------
# 2. Surname normalisation
# ---------------------------------------------------------------------------

def test_last_name_normalised(api: httpx.Client, female_person_id: int):
    raw_surname = "тестОВА"
    event = _create_event(api, female_person_id, raw_surname,
                          effective_date="2026-01-01")
    try:
        stored = event["changes"][0]["new_value"]
        assert stored == "Тестова", f"Expected 'Тестова' got '{stored}'"
    finally:
        _delete_event_safe(api, event["id"])


# ---------------------------------------------------------------------------
# 3. prev_value is NULL until applied
# ---------------------------------------------------------------------------

def test_prev_value_null_on_draft(api: httpx.Client, female_person_id: int):
    event = _create_event(api, female_person_id, "AnyName",
                          effective_date="2026-01-01")
    try:
        assert event["changes"][0]["prev_value"] is None
    finally:
        _delete_event_safe(api, event["id"])


# ---------------------------------------------------------------------------
# 4 & 5. Lifecycle state machine + applied renames person
# ---------------------------------------------------------------------------

def test_lifecycle(api: httpx.Client, female_person_id: int, preserved_last_name: str):
    person_url = BASE_PERSON_PATH.format(person_id=female_person_id)
    original_last_name = preserved_last_name

    event = _create_event(api, female_person_id,
                          unique_name("Smith"),
                          effective_date="2026-02-01")

    # draft -> ready (allowed)
    resp = api.patch(f"{PERSON_EVENTS}/{event['id']}/status",
                     json={"status": "ready"})
    assert resp.status_code == 200, resp.text
    updated = resp.json()["data"]
    assert updated["status"]["name"] == "ready"

    # ready -> applied (allowed)
    resp = api.patch(f"{PERSON_EVENTS}/{event['id']}/status",
                     json={"status": "applied"})
    assert resp.status_code == 200, resp.text
    applied = resp.json()["data"]
    assert applied["status"]["name"] == "applied"

    # Check that the person's last name was actually changed.
    person_after = api.get(person_url).json()
    assert person_after["last_name"] == event["changes"][0]["new_value"], \
        "Person's last_name was not updated"

    # The event's change now carries the previous value.
    list_resp = api.get(f"{PERSON_EVENTS}/by_person/{female_person_id}")
    assert list_resp.status_code == 200
    found = [e for e in list_resp.json() if e["id"] == event["id"]]
    assert len(found) == 1
    assert found[0]["changes"][0]["prev_value"] == original_last_name

    # applied -> ready (allowed) – needed to later delete the event.
    resp = api.patch(f"{PERSON_EVENTS}/{event['id']}/status",
                     json={"status": "ready"})
    assert resp.status_code == 200, resp.text
    assert resp.json()["data"]["status"]["name"] == "ready"

    # ready -> draft (allowed)
    resp = api.patch(f"{PERSON_EVENTS}/{event['id']}/status",
                     json={"status": "draft"})
    assert resp.status_code == 200, resp.text
    assert resp.json()["data"]["status"]["name"] == "draft"

    # Finally delete the draft event. The surname is restored by the fixture.
    _delete_event_safe(api, event["id"])


def test_draft_to_applied_directly_rejected(api: httpx.Client, female_person_id: int):
    event = _create_event(api, female_person_id,
                          unique_name("Rejected"),
                          effective_date="2026-03-01")
    try:
        resp = api.patch(f"{PERSON_EVENTS}/{event['id']}/status",
                         json={"status": "applied"})
        assert resp.status_code == 400, resp.text
    finally:
        _delete_event_safe(api, event["id"])


# ---------------------------------------------------------------------------
# 6. apply_due applies ready events with a past effective_date
# ---------------------------------------------------------------------------

def test_apply_due_applies_past_ready_event(
    api: httpx.Client, female_person_id: int, preserved_last_name: str
):
    today = datetime.date.today().isoformat()
    yesterday = (datetime.date.today() - datetime.timedelta(days=1)).isoformat()

    event = _create_event(api, female_person_id,
                          unique_name("Due"),
                          effective_date=yesterday)
    # Move to ready.
    api.patch(f"{PERSON_EVENTS}/{event['id']}/status", json={"status": "ready"})

    # Now apply due events.
    resp = api.post(f"{PERSON_EVENTS}/apply_due", params={"on_or_before": today})
    assert resp.status_code == 200, resp.text
    stats = resp.json()
    assert stats["applied"] >= 1
    assert event["id"] in stats["applied_ids"]

    # It should now be applied.
    list_resp = api.get(f"{PERSON_EVENTS}/by_person/{female_person_id}")
    found = [e for e in list_resp.json() if e["id"] == event["id"]]
    assert len(found) == 1
    assert found[0]["status"]["name"] == "applied"

    # Move the event back to ready so we can delete it. The surname is restored
    # by the preserved_last_name fixture.
    api.patch(f"{PERSON_EVENTS}/{event['id']}/status", json={"status": "ready"})
    _delete_event_safe(api, event["id"])


# ---------------------------------------------------------------------------
# 7. A future-dated READY event is NOT applied
# ---------------------------------------------------------------------------

def test_apply_due_does_not_apply_future_event(api: httpx.Client, female_person_id: int):
    today = datetime.date.today().isoformat()
    future = (datetime.date.today() + datetime.timedelta(days=30)).isoformat()

    event = _create_event(api, female_person_id,
                          unique_name("Future"),
                          effective_date=future)
    api.patch(f"{PERSON_EVENTS}/{event['id']}/status", json={"status": "ready"})

    resp = api.post(f"{PERSON_EVENTS}/apply_due", params={"on_or_before": today})
    assert resp.status_code == 200, resp.text
    stats = resp.json()
    assert event["id"] not in stats["applied_ids"]

    # The event must still be ready.
    list_resp = api.get(f"{PERSON_EVENTS}/by_person/{female_person_id}")
    found = [e for e in list_resp.json() if e["id"] == event["id"]]
    assert len(found) == 1
    assert found[0]["status"]["name"] == "ready"

    _delete_event_safe(api, event["id"])


# ---------------------------------------------------------------------------
# 8. An applied event cannot be deleted
# ---------------------------------------------------------------------------

def test_applied_event_not_deletable(
    api: httpx.Client, female_person_id: int, preserved_last_name: str
):
    event = _create_event(api, female_person_id,
                          unique_name("CantDelete"),
                          effective_date="2026-04-01")
    # Move ready -> applied.
    api.patch(f"{PERSON_EVENTS}/{event['id']}/status", json={"status": "ready"})
    api.patch(f"{PERSON_EVENTS}/{event['id']}/status", json={"status": "applied"})

    delete_resp = api.delete(f"{PERSON_EVENTS}/{event['id']}")
    assert delete_resp.status_code == 400, delete_resp.text

    # Move back to ready so we can delete the event. The surname is restored by
    # the preserved_last_name fixture.
    api.patch(f"{PERSON_EVENTS}/{event['id']}/status", json={"status": "ready"})
    _delete_event_safe(api, event["id"])


# ---------------------------------------------------------------------------
# 9. A draft event can be deleted
# ---------------------------------------------------------------------------

def test_draft_event_deletable(api: httpx.Client, female_person_id: int):
    event = _create_event(api, female_person_id,
                          unique_name("Deletable"),
                          effective_date="2026-05-01")
    delete_resp = api.delete(f"{PERSON_EVENTS}/{event['id']}")
    assert delete_resp.status_code == 200, delete_resp.text

    # It must disappear from the list.
    list_resp = api.get(f"{PERSON_EVENTS}/by_person/{female_person_id}")
    assert all(e["id"] != event["id"] for e in list_resp.json())


# ---------------------------------------------------------------------------
# 10 & 11. Sex guard – male or no sex gets 400
# ---------------------------------------------------------------------------

def test_male_person_rejected(api: httpx.Client, male_person_id: int):
    resp = api.post(
        f"{PERSON_EVENTS}/by_person/{male_person_id}/last_name_change",
        json={"new_last_name": "Irrelevant", "effective_date": "2026-06-01"}
    )
    assert resp.status_code == 400, resp.text


def test_no_sex_person_rejected(api: httpx.Client, no_sex_person_id: int):
    resp = api.post(
        f"{PERSON_EVENTS}/by_person/{no_sex_person_id}/last_name_change",
        json={"new_last_name": "Irrelevant", "effective_date": "2026-06-01"}
    )
    assert resp.status_code == 400, resp.text


# ---------------------------------------------------------------------------
# 12. Unknown person id
# ---------------------------------------------------------------------------

def test_unknown_person_id_rejected(api: httpx.Client):
    # Use a very high id that cannot exist in a seeded database.
    resp = api.post(
        f"{PERSON_EVENTS}/by_person/99999999/last_name_change",
        json={"new_last_name": "Unknown", "effective_date": "2026-07-01"}
    )
    assert resp.status_code in (400, 404), resp.text

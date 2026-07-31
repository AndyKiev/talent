```json
{
  "max_iterations": 4,
  "allow_paths": ["backend/tests/api/test_person_events.py"],
  "validate": [
    "cd backend && .venv/Scripts/python.exe -m pytest tests/api/test_person_events.py -q"
  ]
}
```

# Objective

Write ONE new file, `backend/tests/api/test_person_events.py`: black-box API tests
for the `person_events` module. Do not modify any other file.

The stack is already running at the base URL the conftest uses. The tests hit real
HTTP endpoints against a seeded database.

# Context — the API under test

Router prefix: `/person_events` (mounted under the v1 api prefix, same as every
other router in the fixtures below).

| Method | Path | Body | Success |
|---|---|---|---|
| GET | `/person_events/by_person/{person_id}` | — | 200, list of events |
| POST | `/person_events/by_person/{person_id}/last_name_change` | `{new_last_name, effective_date, description?}` | 201 |
| PATCH | `/person_events/{id}/status` | `{status}` | 200 |
| DELETE | `/person_events/{id}` | — | 200 |
| POST | `/person_events/apply_due?on_or_before=YYYY-MM-DD` | — | 200, stats dict |

`effective_date` is `'YYYY-MM-DD'`. All endpoints require a bearer token and are
access-guarded; the admin token from the conftest fixtures passes every guard.

## Response shape (POST create / PATCH status)

Both return a mutation response: `{"detail": "<translated text>", "data": {...}}`.
The `data` object is the event:

```
id, person_id, event_type_id, status_id, effective_date, description,
created_by, created_by_name, created_at,
event_type: {id, key, name} | null,
status:     {id, name}      | null,
changes: [ {id, event_id, field_key, prev_value, new_value, created_at} ],
allowed_targets: [str]
```

`event_type.key` is `"LAST_NAME_CHANGE"`. `changes[0].field_key` is `"last_name"`.

## Business rules to cover

1. **Creation makes a DRAFT.** A newly created event has `status.name == "draft"`
   and its `allowed_targets == ["ready"]`. The person is NOT renamed yet.
2. **The surname is normalized.** Posting `new_last_name: "тестОВА"` stores
   `changes[0].new_value == "Тестова"` (first letter upper, rest lower).
3. **`prev_value` is NULL until applied.** On a draft, `changes[0].prev_value is None`.
4. **Lifecycle is a state machine.** `draft -> ready -> applied`, plus `ready -> draft`
   and `applied -> ready`. Any move NOT in that list is rejected with **400**.
   In particular `draft -> applied` directly is a 400.
5. **Applying renames the person.** After PATCHing an event to `applied`, GET the
   list again: `changes[0].prev_value` is now the OLD surname and
   `status.name == "applied"`.
6. **`apply_due` applies READY events whose `effective_date` has arrived.** Returns
   a dict with integer keys `checked`, `applied`, `failed` and a list `applied_ids`.
   An event set to `ready` with a PAST effective date must appear in `applied_ids`.
7. **A future-dated READY event is NOT applied** by `apply_due` with
   `on_or_before` = today.
8. **An applied event cannot be deleted** — DELETE returns 400.
9. **A draft event CAN be deleted** — DELETE returns 200, and it disappears from
   the GET list.
10. **Sex guard.** A surname change may only be recorded for a person whose sex is
    female (app setting `person_last_name_change_female_only`, ON by default).
    A male person gets **400**; a person with NO sex set also gets **400** (a
    different message, but do NOT assert on message text — see constraints).
11. **Unknown person id** on the create endpoint returns 400 or 404 — accept either,
    assert `resp.status_code in (400, 404)`.

# Constraints — read these, they are where previous runs failed

- **NEVER assert on `detail` text.** It is resolved from the database `msg` tables
  and is UKRAINIAN in a seeded environment. Assert status codes and `data` fields
  only. A test that asserts on English message text will pass locally for the wrong
  reason and fail for everyone else.
- **A discovery fixture must SCAN, not take `[0]`.** To find a usable person you
  need one that (a) has at least one employee record and (b) whose sex you can
  control. Iterate candidates and pick the first that qualifies; only `pytest.skip`
  after the whole scan fails. Taking the first row of a list is the bug that makes
  every test skip while pytest still exits 0.
- **Restore what you mutate.** These tests run against a seeded DB, not a throwaway
  one. Any test that changes a person's `sex` or `last_name` must put the original
  value back in a fixture teardown, and must delete the events it created (delete
  drafts via the API; an APPLIED event cannot be deleted, so keep the number of
  applied events you create to the minimum the rules above require).
- **Setting a person's sex**: `PATCH /persons/{person_id}` with `{"sex": "male"}` or
  `{"sex": "female"}`; `{"sex": null}` clears it. That endpoint also requires
  `allow_duplicate: true` in the body when it would trip the namesake check — include
  it to be safe.
- Use the existing fixtures and helpers from `conftest.py` / `tests/helpers/` shown
  below. Do not invent a new HTTP client or a new auth flow.
- Python, pytest, no new dependencies. Match the style of the reference test file.

# Definition of done

`cd backend && .venv/Scripts/python.exe -m pytest tests/api/test_person_events.py -q`
exits 0, with **no test skipped for lack of a candidate person** — a skip that hides
a missing fixture counts as a failure.

# Reference files (do not modify — copy the shape)


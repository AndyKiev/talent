"""Janitor: delete leftover E2E_* records after a crashed/interrupted test run.

Idempotent, black-box HTTP (backend must be running). Run from repo root:

    Windows: backend/.venv/Scripts/python.exe -m backend.tests.cleanup_e2e_data
    Linux:   backend/.venv/bin/python -m backend.tests.cleanup_e2e_data

Extend CLEANUP_TARGETS as new essences gain E2E coverage. Each target's GET
collection endpoint is listed in full (list endpoints' ?name= filters are
EXACT-match lookups, so filtering happens client-side): every record whose
name field starts with E2E_ is deleted by id.
"""

import os
import sys

import httpx

from backend.tests.helpers.unique_name import E2E_PREFIX

DEFAULT_BASE_URL = "http://127.0.0.1:8004/api/v1"
ADMIN_USERNAME = "UKR7101004"

# (essence label, collection path, name field[, value prefix override])
# Prefix matching is CASE-INSENSITIVE. The override is for essences whose
# identifying field is derived/slugged (e.g. review_levels name_key =
# "reviewLevelName_e2e..." - the E2E_ marker is embedded, not leading).
CLEANUP_TARGETS = [
    ("department_categories", "/admin/department_categories", "name"),
    ("department_types", "/admin/department_types", "name"),
    ("jobs", "/jobs", "name"),
    ("job_groups", "/job_groups", "name"),
    ("job_group_types", "/job_group_types", "name"),
    ("talent_statuses", "/admin/talent_statuses", "name"),
    ("talent_periods", "/admin/talent_periods", "name"),
    ("user_group_types", "/admin/user_group_types", "name"),
    ("user_groups", "/admin/user_groups", "name"),
    ("employee_event_types", "/admin/employee_events/employee_event_types", "name"),
    ("employee_event_direction_types", "/admin/employee_events/employee_event_direction_types", "name"),
    ("employee_event_statuses", "/admin/employee_events/employee_event_statuses", "name"),
    ("review_dimensions", "/review_dimensions", "name"),
    ("review_levels", "/review_levels", "name_key", "reviewLevelName_e2e"),
    ("review_session_statuses", "/review_session_statuses", "name"),
    ("plan_session_statuses", "/admin/plan_session_statuses", "name"),
    ("plan_category_defaults", "/admin/plan_category_defaults", "name"),
    ("plan_scope_defaults", "/admin/plan_scope_defaults", "name"),
    ("training_categories", "/training_categories", "name"),
    ("employee_training_statuses", "/employee_training_statuses", "key"),
    ("recruitment_dimensions", "/recruitment_dimensions", "name"),
    ("recruitment_candidate_sources", "/recruitment_candidate_sources", "key"),
]


def main() -> int:
    base_url = os.getenv("E2E_API_BASE_URL", DEFAULT_BASE_URL).rstrip("/")
    try:
        login = httpx.post(
            f"{base_url}/jwt/login",
            data={"username": ADMIN_USERNAME, "password": "e2e"},
            timeout=10,
        )
    except httpx.ConnectError:
        print(f"[ERR] Backend unreachable at {base_url} - start the stack (/start1) first.")
        return 2
    if login.status_code != 200:
        print(f"[ERR] Login failed: {login.status_code} {login.text}")
        return 2

    token = login.json()["access_token"]
    total = 0
    with httpx.Client(
        base_url=base_url,
        headers={"Authorization": f"Bearer {token}"},
        timeout=30,
    ) as api:
        for target in CLEANUP_TARGETS:
            label, path, name_field = target[0], target[1], target[2]
            prefix = (target[3] if len(target) > 3 else E2E_PREFIX).lower()
            listing = api.get(path)
            if listing.status_code != 200:
                print(f"[WARN] {label}: list failed {listing.status_code} {listing.text}")
                continue
            leftovers = [
                r
                for r in listing.json()
                if str(r.get(name_field, "")).lower().startswith(prefix)
            ]
            for record in leftovers:
                deleted = api.delete(f"{path}/{record['id']}")
                status = "[OK]" if deleted.status_code == 200 else "[WARN]"
                print(f"{status} {label}: delete id={record['id']} {name_field}={record.get(name_field)} -> {deleted.status_code}")
                if deleted.status_code == 200:
                    total += 1
            if not leftovers:
                print(f"[OK] {label}: nothing to clean")
    print(f"[OK] Done, deleted {total} record(s).")
    return 0


if __name__ == "__main__":
    sys.exit(main())

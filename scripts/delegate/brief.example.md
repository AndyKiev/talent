```json
{
  "max_iterations": 4,
  "allow_paths": ["backend/tests/api/"],
  "validate": [
    "cd backend && .venv/Scripts/python.exe -m py_compile tests/api/test_department_targets.py"
  ]
}
```

# Objective

Write black-box API tests for the department-targets endpoints, covering the
per-status vs combined target logic.

# Context

## Rule (from the knowledge vault, `Business-Rules/Department Targets`)

A `job_group` decides how its targets are entered:

- `combined` — exactly ONE row, `target_status_set = PA_PO`
- `per_status` — exactly TWO rows, `PA_ONLY` and `PO_ONLY`

Unique constraint: `(department_id, job_group_id, period_id, target_status_set_id)`.
Only departments in the `directorate` or `hypermarket` categories may have targets.
The row-count rule is application validation, not a DB constraint.

## Conventions that matter (vault: `Naming Conventions`, `E2E Testing`)

- Python is `snake_case`; no dashes anywhere, in any name.
- Endpoint paths use underscores, never dashes.
- Tests are black-box against a running stack; they never start it.

## Copy the shape of this existing file

<paste the full content of backend/tests/api/test_employee_missions.py here>

# Constraints

- Only touch files under `backend/tests/api/`.
- No new dependencies.
- Follow the fixture style of the pasted reference exactly.

# Definition of done

- `tests/api/test_department_targets.py` exists and compiles.
- It covers: combined logic accepts one row and rejects a second; per_status
  requires both PA_ONLY and PO_ONLY; the unique constraint is exercised; a
  department outside directorate/hypermarket is rejected.
- Every test has an explicit assertion — no test that only checks a 200.

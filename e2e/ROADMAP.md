# E2E Testing Program — brief for whoever continues this work

Self-contained instructions (human or AI) for extending the TALENT E2E test
system in the expected way. Read this together with `e2e/COVERAGE.md` (the
live registry of what is covered) and `.claude/skills/e2e/SKILL.md` (rules +
commands). If those three disagree, fix the disagreement first.

## Target

Every user-facing module in the app has automated coverage at one of two
levels, rolled out module by module:

- **SMOKE** — page loads authenticated, main grid/board renders, no error alert.
- **FULL** — SMOKE + the happy-path main flow (for CRUD essences: create ->
  edit -> delete through the real UI, mirrored by an API-level lifecycle test).

End state: `e2e/COVERAGE.md` has no NONE rows; admin CRUD essences are FULL;
complex modules (people_review, planning, recruitment boards) are at least
SMOKE with FULL added only for their primary flow.

## Architecture (do not re-decide these)

Two layers, both black-box against the ALREADY-RUNNING dev stack + dev DB:

1. **Playwright** (`e2e/`, own npm workspace) — chromium vs frontend :4004.
   Auth is programmatic: a `setup` project logs in via the API
   (`BYPASS_LDAP=true`, admin `UKR7101004`, any password) and injects tokens
   into localStorage `auth-storage` (storageState `.auth/admin.json`).
2. **pytest API** (`backend/tests/`) — sync httpx vs backend :8004.

Non-negotiable rules (full detail in the skill):

- NEVER auto-start servers. Preflights fail fast with "run /start1 first"
  (Linux: venv active, then `make db-up` + `make run-backend` + `make run-frontend`).
- Shared dev DB: create only `E2E_`-prefixed records, track + delete them
  (cleanup fixture / try-finally), never mutate pre-existing rows.
- `workers=1`, no parallelism.
- Selectors are translation-proof: `data-field`, roles, icon testids,
  `input[name=...]`, `.MuiButton-contained/-outlined`. Never translated text.
- Project naming: no dashes anywhere; snake_case folders/specs, camelCase helpers.

## How to run / read results

- `cd e2e && npx playwright test` — terminal list, ok = green, x = red;
  `npx playwright show-report` opens the html report; failed tests carry a
  trace (replayable steps + screenshots). `--headed` to watch live.
- `cd backend && poetry run pytest tests -q` — dots green, F red.
- Interrupted run (repo root): Windows
  `backend\.venv\Scripts\python.exe -m backend.tests.cleanup_e2e_data`,
  Linux `backend/.venv/bin/python -m backend.tests.cleanup_e2e_data`.
- OS note: test commands are identical on Windows and Linux; only venv paths,
  browser-install extras and browser locations differ — the full Windows⇄Linux
  table lives in `TESTING.md`.

### Environment gotcha: browser install is HUMAN-only

Playwright's browser binaries live OUTSIDE the repo (Windows:
`%LOCALAPPDATA%\ms-playwright`, Linux: `~/.cache/ms-playwright`). AI-agent
shells sandbox writes outside the project folder: if an agent runs
`npx playwright install`, the download lands in overlay storage only the
agent sees — the agent's runs go green while the user's runs fail with
"Executable doesn't exist", which is maximally confusing. Rule:
`npx playwright install chromium` (first setup and after any Playwright
version bump; on Linux add `--with-deps` so the required system libraries get
apt-installed too) is run by the USER in their own terminal, confirming
download progress output. An agent must never "fix" missing browsers itself —
it must hand the command to the user.

## The increment loop (one module at a time)

Pick the next module (order below), then:

0. **Read first, write second**: the essence's backend `_schema.py` (field
   `max_length`s!), its `Form.tsx` (required fields, html maxLength, selects),
   and its `Crud.tsx` (edit-mode switch? confirm dialog on inline edit? extra
   `_actions` buttons? page filter?). Copying the pilot without this produced
   5 red tests in the first batch - the full trap list is in the /e2e skill's
   "Checklist for new module specs".
1. **API test** — `backend/tests/api/test_<essence>.py`: one list test + one
   `run_crud_lifecycle(...)` call (`backend/tests/helpers/crud_lifecycle.py`).
   ~10 lines. Skip for non-CRUD pages.
2. **Playwright spec** — copy `e2e/tests/admin/department_categories.spec.ts`
   (THE canonical template), swap PATH/ROUTE/fields. Reuse helpers
   (`dataGrid.ts`, `dialogs.ts`, `cleanupTracker.ts`, `apiClient.ts`,
   `uniqueName.ts`); extend helpers rather than inlining new selector logic.
3. **Janitor** — add the essence to `CLEANUP_TARGETS` in
   `backend/tests/cleanup_e2e_data.py` (client-side `E2E_` prefix filter;
   the `?name=` query is an EXACT lookup that 404s on miss — never rely on it
   for prefix search).
4. **Registry** — add/upgrade the module row in `e2e/COVERAGE.md` with today's
   date in Last synced.
5. **Verify** (definition of done, all required):
   - the new spec + API test pass **twice back-to-back**;
   - the janitor reports "nothing to clean" afterwards (zero leftovers);
   - the FULL suite still passes (no cross-module breakage);
   - no pre-existing DB rows were modified or deleted.

Keep increments atomic: one module (or one admin-essence batch) per session/PR.

## Rollout order (next first)

1. Remaining admin CRUD essences, batched by group: departments_group ->
   jobs_group -> talent -> user_groups_group -> training/recruitment/
   review_setup/planning_setup admin. Each is a template copy.
2. employees — SMOKE list + detail tabs (no employee CRUD via UI yet; employee
   creation has heavy cascades — API-side smoke only).
3. recruitment + candidates + interviews — SMOKE boards/dashboard, FULL for
   candidate CRUD.
4. people_review — SMOKE (visibility rules are complex: see /review-comments
   skill before asserting anything about notes).
5. planning, training — SMOKE.
6. developer + settings — SMOKE.

## Metrics (report these after each increment)

- Coverage: counts of FULL / SMOKE / NONE rows in COVERAGE.md (goal: NONE -> 0).
- Suite health: pass rate on two consecutive full runs (goal: 100%, zero flakes;
  a test that fails once on a healthy stack is a bug to fix, not to retry).
- Cleanliness: janitor deletions after a normal run (goal: always 0).
- Runtime: full Playwright suite duration (keep under ~10 min; if it grows past
  that, discuss splitting into smoke vs full profiles BEFORE adding more).

## Keep-in-sync contract (why this exists)

Any feature/refactor touching a module with a FULL/SMOKE row must update that
module's specs, run them, and bump Last synced — this replaces manual
verification for covered behavior. The `/e2e` skill enforces this decision
rule for AI sessions; this file is the durable spec of the program itself.

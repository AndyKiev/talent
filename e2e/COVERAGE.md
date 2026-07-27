# E2E Coverage Registry

The source of truth for which modules have automated E2E coverage.
Levels: **FULL** = smoke + happy-path CRUD/flow · **SMOKE** = page-load only · **NONE** = manual verification only.

| Module | Routes | Playwright specs | API tests | Level | Last synced |
|---|---|---|---|---|---|
| auth (login) | /auth/login | tests/fe/auth/login.spec.ts | backend/tests/api/test_auth.py | FULL | 2026-07-18 |
| auth (silent token refresh) | any authed route | tests/fe/auth/token_refresh.spec.ts | — | FULL | 2026-07-27 |
| app shell / main menu | / (default-menu forward) | tests/fe/smoke/app_shell.spec.ts | — | SMOKE | 2026-07-18 |
| admin / department_categories | /admin/department_categories | tests/fe/admin/department_categories.spec.ts | backend/tests/api/test_department_categories.py | FULL | 2026-07-18 |
| admin / department_types | /admin/department_types | tests/fe/admin/department_types.spec.ts | backend/tests/api/test_department_types.py | FULL | 2026-07-20 |
| admin / jobs | /admin/jobs_group/jobs | tests/fe/admin/jobs.spec.ts | backend/tests/api/test_jobs.py | FULL | 2026-07-20 |
| admin / job_groups | /admin/jobs_group/job_groups | tests/fe/admin/job_groups.spec.ts | backend/tests/api/test_job_groups.py | FULL | 2026-07-20 |
| admin / job_group_types | /admin/jobs_group/job_group_types | tests/fe/admin/job_group_types.spec.ts | backend/tests/api/test_job_group_types.py | FULL | 2026-07-20 |
| admin / talent_statuses | /admin/talent/statuses | tests/fe/admin/talent_statuses.spec.ts | backend/tests/api/test_talent_statuses.py | FULL | 2026-07-20 |
| admin / talent_periods | /admin/talent/periods | tests/fe/admin/talent_periods.spec.ts | backend/tests/api/test_talent_periods.py | FULL | 2026-07-20 |
| admin / talent_status_period_links | /admin/talent/status_period_links | tests/fe/admin/talent_status_period_links.spec.ts | backend/tests/api/test_talent_status_period_links.py | FULL | 2026-07-20 |
| admin / user_group_types | /admin/user_groups_group/user_group_types | tests/fe/admin/user_group_types.spec.ts | backend/tests/api/test_user_group_types.py | FULL | 2026-07-20 |
| admin / user_groups | /admin/user_groups_group/user_groups | tests/fe/admin/user_groups.spec.ts | backend/tests/api/test_user_groups.py | FULL | 2026-07-20 |
| admin / employee_event_types | /admin/employee_events/employee_event_types | tests/fe/admin/employee_event_types.spec.ts | backend/tests/api/test_employee_event_types.py | FULL | 2026-07-20 |
| admin / employee_event_direction_types | /admin/employee_events/employee_event_direction_types | tests/fe/admin/employee_event_direction_types.spec.ts | backend/tests/api/test_employee_event_direction_types.py | FULL | 2026-07-20 |
| admin / employee_event_statuses | /admin/employee_events/employee_event_statuses | tests/fe/admin/employee_event_statuses.spec.ts | backend/tests/api/test_employee_event_statuses.py | FULL | 2026-07-20 |
| admin / review_dimensions | /admin/people_review/review_setup/dimensions/list | tests/fe/admin/review_dimensions.spec.ts | backend/tests/api/test_review_dimensions.py | FULL | 2026-07-20 |
| admin / review_levels | /admin/people_review/review_setup/levels/list | tests/fe/admin/review_levels.spec.ts | backend/tests/api/test_review_levels.py | FULL | 2026-07-20 |
| admin / review_session_statuses | (API only) | — | backend/tests/api/test_review_session_statuses.py | FULL (API) | 2026-07-20 |
| admin / plan_session_statuses | /admin/planning_setup/plan_session_status | tests/fe/admin/plan_session_statuses.spec.ts | backend/tests/api/test_plan_session_statuses.py | FULL | 2026-07-20 |
| admin / plan_category_defaults | /admin/planning_setup/plan_category_defaults | tests/fe/admin/plan_category_defaults.spec.ts | backend/tests/api/test_plan_category_defaults.py | FULL | 2026-07-20 |
| admin / plan_scope_defaults | /admin/planning_setup/plan_scope_defaults | tests/fe/admin/plan_scope_defaults.spec.ts | backend/tests/api/test_plan_scope_defaults.py | FULL | 2026-07-20 |
| admin / training_categories | /admin/training/categories | tests/fe/admin/training_categories.spec.ts | backend/tests/api/test_training_categories.py | FULL | 2026-07-20 |
| admin / employee_training_statuses | /admin/training/statuses | tests/fe/admin/employee_training_statuses.spec.ts | backend/tests/api/test_employee_training_statuses.py | FULL | 2026-07-20 |
| admin / recruitment_dimensions | (API only) | — | backend/tests/api/test_recruitment_dimensions.py | FULL (API) | 2026-07-20 |
| admin / candidate_sources | (API only) | — | backend/tests/api/test_candidate_sources.py | FULL (API) | 2026-07-20 |
| department_job_targets (headcount plan) | (API only) | — | backend/tests/api/test_department_job_targets.py | FULL (API) | 2026-07-27 |
| admin / other essences (persons, structure) | /admin/... | — | — | NONE | — |
| employees | /employees, /employees/$employeeId/* (summary, events, career_history, departments, responsibility_history, talent_audit, trainings), /employees/headcount_plan | — | — | NONE | — |
| people review | /people_review, /people_review/my, /people_review/$sessionId, .../employee/$employeeId | — | — | NONE | — |
| planning | /planning, /planning/$sessionId | — | — | NONE | — |
| recruitment | /recruitment, /recruitment/$taskId/* (board, details, requirements), /recruitment_board, /recruitment_dashboard | — | — | NONE | — |
| candidates | /candidates, /candidates/$candidateId | — | — | NONE | — |
| interviews | /interviews | — | — | NONE | — |
| training | /training, /training/state, /training/types | — | — | NONE | — |
| developer | /developer/* (audit_log, catalog, security, settings, translations, process_roles, event_apply) | — | — | NONE | — |
| settings | /settings, /settings/$groupKey | — | — | NONE | — |

## How to update

- Any change touching a **covered** module (FULL/SMOKE): update the listed specs to match the feature, run them, bump **Last synced**.
- Adding coverage to a NONE module: copy the pilot pattern (`tests/fe/admin/department_categories.spec.ts` + `backend/tests/api/test_department_categories.py` via `run_crud_lifecycle`), add the row here, register the essence in `backend/tests/cleanup_e2e_data.py` `CLEANUP_TARGETS`. New Playwright specs always go under `tests/fe/<group>/` (never bare `tests/<group>/`) — see the `/e2e` skill for why.
- Splitting a row: when a module gains multiple specs, one row per sub-area is fine.

Rules and commands live in the `/e2e` skill (`.claude/skills/e2e/SKILL.md`).
The program brief (target, increment loop, rollout order, metrics) is `e2e/ROADMAP.md`.

Known env pitfall: "Executable doesn't exist" = browser binaries missing from
`%LOCALAPPDATA%\ms-playwright` — the USER must run `cd e2e; npx playwright
install chromium` themselves (AI-agent installs land in sandbox storage the
user's shell never sees). Details: TESTING.md Troubleshooting + ROADMAP.md.

Running/filtering: `npx playwright test fe` (frontend only) / `npx playwright test be` (backend pytest, bridged) — see the `/e2e` skill Commands section for how this works and its one caveat.

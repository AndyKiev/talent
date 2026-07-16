# Recruitment process — design & status reference

Module master switch: app setting `recruitment_module_enabled` (app-only). When
OFF, the whole `recruitment` menu subtree is dropped server-side in
`menu_service.get_my_menus()` and every `/recruitment*`, `/candidates`,
`/interviews` frontend route redirects home.

## 1. Big picture

```
recruitment (menu parent, dropdown)
├── Overview      /recruitment_dashboard   nav cards + tasks-per-status chart (period range, wheel picker)
├── Tasks         /recruitment             DataGrid ⇄ cards (persisted per user), double-click opens task
├── Board         /recruitment_board       cascading filter (top-level department → job → task) → kanban
├── Candidates    /candidates              candidate cards → detail (Timeline / Applications / Feedback)
└── Interviews    /interviews              interviewer's (or all) interviews + feedback composer
```

A **recruitment task** = one vacancy search for a **job** (optionally scoped to
an exact **department**, with `openings` = how many people are wanted, default
1). Per-job **requirement groups/items** describe who to search for.
**Candidates** are registered separately and are attached to tasks through
**applications** — one application per (candidate, task), each with its own
pipeline stage, so a person can be at different stages in different vacancies.
Task detail tabs are URLs: `/recruitment/$taskId/{board|details|requirements}`,
the **board is the default tab**.

## 2. Entities (tables)

| table | purpose | key columns / rules |
|---|---|---|
| `recruitment_tasks` | the vacancy search | `job_id` (RESTRICT), `requirement_group_id?`, `department_id?` (exact node; top org unit derived, API-only), `openings` (≥1, default 1), `status_id`, `comment`, `target_deadline`, `created_by/at`, `in_process_at`, `closed_at` |
| `recruitment_task_statuses` | fixed lookup | created / in_process / fulfilled / rejected (seeded) |
| `job_requirement_groups` | per-JOB requirement sets | one **active** group per job (activating deactivates siblings); task links one group |
| `job_requirement_items` | numbered, reorderable points | `dimension_id` → `recruitment_dimensions` (admin CRUD lookup) |
| `candidates` | the person being hired | `first_name/last_name`, `email?` (unique), `source_id?` → `candidate_sources` (admin CRUD lookup), phones = child rows |
| `candidate_phones` | several phones per candidate | managed inline via the candidate payload |
| `candidate_notes` | timeline notes | `author_id`, `body`, `created_at` |
| `candidate_applications` | candidate ⇄ task pipeline row | **uq(candidate_id, recruitment_task_id)**, `status_id` → `pipeline_statuses` |
| `application_status_history` | append-only stage log | one row per move (`status_id`, `changed_by/at`) — drives the candidate Timeline |
| `pipeline_statuses` | fixed stage lookup | applied(0) screen(1) interview(2) offer(3) hired(4) rejected(5); `sort_order` drives kanban column order (board reads THIS table, not a hardcoded list) |
| `interviews` | scheduled interview for an application | `scheduled_at` (tz), `location`, created_by/at |
| `interview_interviewers` | ≤3 per interview | employee must hold a **manager-category job**; assigning auto-adds them to the `Interviewer` user group |
| `interview_feedbacks` | feedback per interview | `body`, `recommendation?` ∈ {hire, no_hire, maybe}, `author_id` (interviewer or HR) |

## 3. Recruitment TASK status machine

`backend/api_v1/recruitment_task/recruitment_task_state_machine.py` — fixed
names matched against `recruitment_task_statuses`; **reversible**:

```
created ──→ in_process ──→ fulfilled
   ▲  │          ▲│  ▲          │
   │  └──→ rejected│  └─────────┘   (fulfilled ⇄ in_process = reopen)
   └──── in_process / rejected can go back to created
```

- created → {in_process, rejected}
- in_process → {created, fulfilled, rejected}
- fulfilled → {in_process} · rejected → {created, in_process}

Rules enforced in `recruitment_task_service.change_status`:
- **in_process requires a linked requirement group** (`requirement_group_id`).
- **fulfilled requires ≥1 application in `hired`** for the task
  ("fulfilled" = the position was actually filled).
- Timestamps: entering in_process stamps `in_process_at` (kept on reopen);
  entering fulfilled/rejected stamps `closed_at`; moving back clears the
  relevant stamps (back to created clears both).
- Closed (fulfilled/rejected) tasks are read-only until reopened; delete is
  only allowed while `created`.

## 4. Candidate PIPELINE state machine (per application)

`backend/api_v1/candidate_application/candidate_application_state_machine.py`:

```
applied → screen → interview → offer → hired      (forward, skipping allowed)
   └────────┴─────────┴──────────┴──→ rejected     (side exit from any non-terminal)
```

- **Forward** to ANY later stage is legal (applied → offer is fine).
- **hired / rejected are terminal** for regular users.
- **Backward override**: `admin` / `HRS` (and the bypass `dev` group) may move a
  card to ANY other stage, including out of hired/rejected — no limits. The
  frontend always shows a **consequences warning dialog** first; the server
  enforces the group check (`_can_override_transitions`). History records every
  move either way.

Gates checked in `candidate_application_service.change_status` (they apply to
overrides too):
- **interview**: the application must have a scheduled interview. The normal
  flow is the reverse — dropping a card on the Interview column opens the
  scheduling dialog, and `interview_service.create_interview` auto-advances the
  card once the interview exists.
- **capacity**: applications in `offer` + `hired` together may not exceed the
  task's `openings` when ENTERING that set (offer → hired keeps the same seat).
- Every successful move appends an `application_status_history` row (the first
  `applied` row is written on application creation).

The kanban confirm-on-drop dialog is gated by the per-user overridable app
setting `pipeline_drag_confirm`; moves are optimistic (instant card move,
rollback + error toast on refusal).

## 5. Interviews

- Created from the board (`POST /interviews`): when + where + **1..3
  interviewers**, each of whom must hold a job linked to the `manager`
  job-category (`job_job_category_links`). `/interviews/available_interviewers`
  feeds the picker.
- Assigning an interviewer **idempotently adds them to the `Interviewer` user
  group** (seeded by migration; authorisation-type).
- Feedback (`POST /interview_feedbacks`): body + optional recommendation;
  written by interviewers or HR; surfaces on the interview card AND the
  candidate's Feedback tab (`GET /interview_feedbacks?candidate_id=`).

## 6. Hired → employee

A card in `hired` shows **Register employee** → dialog prefilled from the
candidate (first/last name, email) and the task (job locked, department
editable, defaulted) + employee code + activation date. It POSTs to the
pre-existing atomic `POST /employees/with_activation` (person + employee +
activation event). Guarded by employee CREATE for now — a dedicated access
group can replace that guard later.

## 7. Roles & access (seeded)

| group | rights |
|---|---|
| `HRM` / `HRS` | full CRUD on recruitment_task, requirement groups/items, recruitment_dimension, candidate_source, candidate, candidate_application, interview, interview_feedback; VIEW on department + pipeline_status |
| `admin` | everything (manifest-driven) · `dev` | bypass |
| `Interviewer` | VIEW interview / candidate / candidate_application / pipeline_status; CREATE interview_feedback. Auto-membership on assignment |
| backward pipeline moves | `admin` / `HRS` (+ dev) only — see §4 |

Menus are visible to HRS/HRM/admin/dev (interviews also to Interviewer; the
parent `recruitment` menu carries the Interviewer link so the child is
reachable).

## 8. Implementation notes

- **noload + mini enrichment** everywhere: Employee/Job/Department/group nested
  display objects are `lazy="noload"` on the models; services fill slim minis
  via batched COLUMN queries (`employee_minis.fetch_employee_minis`, org index
  for departments). Never selectin-load those graphs — it made lists take
  seconds. See `.claude/skills`-adjacent memory "noload-plus-mini-enrichment".
- Migrations (in order): `2fb545f92aa0` base module · `ed6d9c35f600` task
  department · `b48553770211` candidates/pipeline (+ statuses, menu) ·
  `a4014dfde1e9` menu nesting · `7cb556f124fc` openings · `a4a8e53b7b46`
  interviews (+ Interviewer group, menu) · `982ecf979453` dashboard/board menus.
- Grants seeder: `backend/seeds/seed_group_access.py` (HR_ESSENCES,
  HR_VIEW_ONLY_ESSENCES, INTERVIEWER_GRANTS).
- All user-facing strings live in the DB msg tables (EN+UK); pipeline stage
  labels are `pipelineApplied…pipelineRejected`, task statuses
  `recruitmentStatus*`, transitions `recruitmentTask{Start,Fulfill,Reject,ToCreated}`.
- Frontend slices: `components/recruitment/{tasks,requirements,board,dashboard}`,
  `components/candidates`, `components/interviews`,
  `components/pickers/DepartmentJobPicker` (category → top unit → tree → job;
  see the `dep-job-picker` skill). Tasks list view mode (grid ⇄ cards) persists
  via zustand `recruitmentViewStore` (see the `grid-cards-toggle` skill);
  column visibility via the user-grid-columns system.

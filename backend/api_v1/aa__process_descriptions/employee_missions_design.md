# Employee development missions (IDP) — design & status reference

The development plan of an employee: a list of **missions**, each with one or
more **KPIs** carrying a fulfilment percentage, optionally linked to a
**competence** to develop.

Replaces the former `review_session_employees.development_plan` — a JSON blob on
the review record. A development plan belongs to the **person**, not to one
review session, so it now survives across sessions and is managed from the
employee card as well as from inside a people review.

## 1. Big picture

```
Employee card  /employees/$employeeId/missions      (4th tab, next to Talent audit)
People review  → 3rd analysis tab "Development plan"
                 └── both render the SAME <MissionsPanel>, so they cannot drift

MissionsPanel
├── sub-tab "Missions"           grid ⇄ cards (persisted per user), add/edit/delete
│     └── each card: status chip · period · duration · progress · KPIs
│                    comments · history · revert
└── sub-tab "Development vision" the employee's own free text
```

Who does what — this is the crux of the module:

| actor | missions / KPIs / % | comments + vision | history |
|---|---|---|---|
| oversight manager (roster-scoped) | **full CRUD** | — | — |
| admin / dev | full CRUD + **revert** | full CRUD | yes |
| HRM / HRS | read | — | yes |
| the employee themselves | **read only** | **write** | — |
| line manager (supervision scope) | read | — | — |

The employee cannot edit their own plan — that is the point of the module. Their
write surface is **mission comments** and the **development vision**.

## 2. Entities (tables)

| table | purpose | key columns / rules |
|---|---|---|
| `employee_missions` | one mission | `employee_id` (CASCADE), `text`, `start_date`, `end_date`, `status_id` |
| `employee_mission_kpis` | measurable targets | `mission_id` (CASCADE), `text`, `percent` 0–100 (CHECK), `sort_order` |
| `employee_mission_statuses` | lookup | `key` (unique), `description`, `sort_order` |
| `employee_mission_dimension_links` | optional competence, **1:1** | `mission_id` UNIQUE + `dimension_id`, **both FKs CASCADE** |
| `employee_mission_comments` | employee's notes on a mission | `mission_id` (CASCADE), `author_employee_id`, `text` |
| `employee_development_visions` | one per employee | `employee_id` UNIQUE, `text`, `updated_at` |

**No nullable columns anywhere.** Two consequences worth understanding:

- The *optional* competence is the **presence or absence of a link row**, not a
  nullable FK (the `/optional-essence-property` pattern). Both FKs CASCADE, so
  deleting the mission **or** the competence cleans up with zero service code.
- There is no `created_by` / `updated_by`. Attribution is the audit pattern
  (§6). `author_employee_id` on comments is different — that is *whose content
  it is*, a domain fact, not "who last touched it".

## 3. Derived values — the three things never stored by hand

### `end_date`
Computed from `start_date` + a duration in months, using `relativedelta` so
`31 Jan + 1 month` lands on **28 Feb** instead of overflowing into March. Never
accepted from the client.

### duration in months — deliberately NOT a column
Months only ever existed to *derive* `end_date`. Storing both invited drift, so
the period is the stored truth and the duration is back-calculated by
`months_between()` — the inverse of `compute_end_date()`, stepping back when
relativedelta clamped the date, so the round-trip is exact.

### `status_id`
| status | rule |
|---|---|
| `completed` | every KPI at 100% |
| `in_process` | at least one KPI has progress |
| `planned` | nothing started |

`compute_status_key()` is the single definition; `apply_status()` re-derives and
persists after **every** write that can move a KPI (mission create, KPI
create/update/delete). Stored rather than computed on read so it is filterable
in SQL and recordable in the trail.

> Statuses are a DB lookup so the *label* stays translatable — but the **keys are
> a code contract** (resolved by key, never by id, so they survive a reseed). Do
> not rename them. There is deliberately no admin CRUD page for this reason.

### "Active" — what the cap counts
```
active = NOT expired AND NOT accomplished
```
Both exits matter: completing a mission **or** outliving its period frees a slot
under `mission_max_active`, without anyone deleting history. `is_mission_active()`
is the one definition, and the API returns `is_active` / `is_expired` /
`is_accomplished` so the UI and the cap can never disagree.

## 4. Rules the schema cannot express (so they live in the service)

| rule | where |
|---|---|
| a mission must keep **≥ 1 KPI** | Pydantic `min_length=1` on create **and** delete refuses the last one |
| duration within `mission_max_duration_months` | `_validate_duration` |
| at most `mission_max_kpis` per mission | create **and** the add-one path |
| at most `mission_max_active` active missions | `_assert_active_capacity`, on create |
| KPI text ≤ `idp_kpi_max_length` | `_validate_text` |

Bounds come from **app settings, not DB CHECKs** — a developer can change a
setting, and a baked-in constraint would make that setting a lie. Only the truly
invariant ones are CHECKs: `end_date >= start_date`, `percent` 0–100.

### Revert (admin / dev only)
Not a status edit. Status is derived, so the only coherent "undo" is to restore
the **KPI progress** that produced the earlier status — after which the status
recomputes itself. `previous_kpi_percents()` reads `changes.percent.old` of the
newest trail entry per KPI. `can_revert` on the read schema tells the UI whether
there is anything to go back to. Restricted to admin/dev because it rewrites an
assessment *of a person* — deliberately not an oversight power.

## 5. Access control

`employee_mission_access.py` is the single authority. Four distinct levels:

| level | who | mechanism |
|---|---|---|
| **read** | admin/dev, the employee, line manager, oversight-in-roster | `PeopleReviewScopedGuard(VIEW, EMPLOYEE_MISSION)` on `/employee/{employee_id}` routes |
| **write** missions/KPIs/% | admin/dev, or the oversight manager whose roster contains the employee | `assert_can_manage` |
| **write** comments/vision | the employee themselves, or admin/dev | `assert_can_author` (+ `assert_owns_comment` to edit an existing one) |
| **history** | HRM, HRS, admin, dev | `Guard(VIEW, EMPLOYEE_MISSION_HISTORY)` |

Two subtleties that are easy to get wrong:

- **Why write needs custom code.** `PeopleReviewScopedGuard` passes for *self*
  and for *supervision* — both must be read-only here. Plain `Guard` passes only
  for admin — but the oversight manager is not an admin. Neither existing guard
  expresses it.
- **Self-exclusion.** One's own id is *always* in the visible set, so
  `assert_can_manage` additionally requires `employee_id != user.id` — otherwise
  an oversight manager could set their own fulfilment percentages.
- **Roster source is session-independent.** `_visible_employee_ids()` resolves
  the roster from the process-role holder links, **not** from
  `review_session_employees` — so a manager can create the first mission for an
  employee who has never been in a review session. It does depend on the user's
  **active mode**: with no mode selected the backend sees "only myself" and
  refuses, which the UI explains rather than looking broken.
- Routes keyed by `mission_id` / `kpi_id` carry **no** route guard (there is no
  `{employee_id}` to scope on) — the service resolves the owner first. That
  includes the GET routes: mission ids are sequential, so an unguarded read
  would let anyone walk them.

## 6. Audit trail

Uses the generic `change_session` + `change_log` tables via `mission_audit.py`.
One run per request, opened already closed (`success` + `finished_at`) so there
is no half-finished window and no post-commit bookkeeping that could itself fail.

Essence keys: `employee_mission`, `employee_mission_kpi`,
`employee_mission_comment`, `employee_development_vision`.

Two read endpoints:

- `GET /employee_missions/{id}/history` — one mission.
- `GET /employee_missions/employee/{id}/history` — the whole employee,
  **including deleted missions**. This matters: a deleted mission leaves no row
  to click, so its per-mission history is unreachable; the trail survives, and
  the delete entry carries the old text, which is where the mission's name comes
  from. KPI rows removed with a mission hang off it via `parent_id`.

The employee-level view groups by mission, replaces `dimension_id` with the
competence **name** (HR cannot resolve ids), folds `start_date`/`end_date` into
one `period` row, and hides internal bookkeeping (`migrated_from_rse_id`).

> A dedicated essence (`employee_mission_history`) exists so HR never needs
> `CHANGE_LOG`, which would expose the entire system audit trail.

## 7. App settings

| key | default | effect |
|---|---|---|
| `mission_max_duration_months` | 36 | caps the form's duration wheel; re-validated server-side |
| `mission_max_kpis` | 2 | create **and** add-one; the FE hides "Add KPI" at the cap |
| `mission_max_active` | 5 | refuses a new mission when the employee is at the cap |
| `mission_cards_per_row` | 2 | desktop column count for the card view (clamped 1–4) |
| `idp_kpi_max_length` | 126 | reused from people review |

All app-only (not user-overridable), `visible_to_regular` because the oversight
manager filling the form is not necessarily an admin.

## 8. Frontend

```
frontend/src/components/missions/
├── MissionsPanel.tsx        THE shared panel (both hosts render it)
├── MissionCard.tsx  MissionKpiList.tsx  useMissionColumns.tsx
├── MissionFormDialog.tsx    DatePicker + duration wheel + KPI rows
├── MissionDurationWheel.tsx wraps WheelColumn (imported, never copied)
├── MissionKpiPercentDialog.tsx  MissionCommentsDrawer.tsx
├── MissionHistoryDialog.tsx     both scopes (one mission / whole employee)
├── DevelopmentVisionCard.tsx
├── missionApi.ts  missionHelpers.ts  useMissionMutations.ts
└── useMissionPermissions.ts   UI affordance ONLY — the server re-derives all of it
```

- **Dates**: `<DatePicker>` showing `DD.MM.YYYY`, storing `YYYY-MM-DD`; duration
  on a scroll wheel; end date is a read-only preview (the server recomputes).
- **Competence options come from `GET /review_dimensions` BY ID** in both hosts.
  The review `Evaluation` rows carry only a `dimension_key`, and the link table
  references `review_dimensions.id`; the old lowercase-key matching died with
  the JSON column.
- **Inactive missions render pale** — expired *or* accomplished, since both stop
  counting. Theme-aware (opacity + theme text colours, never a hardcoded grey,
  which would vanish in one of the two themes).
- Dialogs **mount fresh** rather than syncing state from props in an effect
  (lint-blocked, and it causes cascading renders).

## 9. Migration history

1. `5481033843c6` — create the five mission tables.
2. `backend/scripts/migrate_development_plans.py` — the data move, run **between**
   the two revisions. Takes the last review record per employee with a non-empty
   plan, resolves `dimension_key` → id case-insensitively (JSON stored
   `people_planet`, the table stores `PEOPLE_PLANET`), generates KPI text for
   missions that predate the field. Idempotent, `--dry-run` first.
   Result: 73 employees, 218 missions, 0 unresolved competences.
3. `dafe3b95ca2f` — statuses + `status_id` (seeded, backfilled, *then* tightened
   to NOT NULL) and `drop duration_months`. Downgrade recomputes the duration
   rather than losing it.

`review_session_employees.development_plan` is still **mapped but deprecated** —
kept so `--autogenerate` cannot drop it in the same revision that creates these
tables (the data move has to run in between). Delete the attribute only once the
move has been applied everywhere, then autogenerate the drop on its own.

## 10. Consequences worth knowing

- **Employees lost direct edit rights** on their plan. Intended: comments + the
  development vision are the replacement write surface.
- **TEMPO albums are no longer a per-session snapshot.** Re-exporting an album
  for a closed session renders the employee's *current* missions. That follows
  from employee-level ownership. If a historical album must stay frozen, the fix
  is to snapshot `idp_missions` at session close — a separate decision.
- `_development_missions()` keeps the **same dict shape** (`{text, kpi,
  dimension_key, name, color}`), so `tempo_html` / `tempo_pdf` / `tempo_pptx`
  were not touched. That contract is the clean seam of the refactor.
- Missions left the people-review **autosave** entirely, and
  `useCompetenceSummary` no longer rewrites the plan when the summary changes —
  a reviewer editing one session must not mutate the employee's standing plan.

## 11. Tests

`backend/tests/api/test_employee_missions.py` — black-box, needs the stack
(`/start1`) running:

```
cd backend && poetry run pytest tests/api/test_employee_missions.py -q
```

Covers the derived `end_date` (incl. the 31 Jan clamp), duration/percent bounds,
both halves of the mandatory-KPI rule, cascades, the audit entry after a percent
change, and the **permission matrix** — the highest-value part. The subject
fixture skips loudly if it lands on a bypass user, since every 403 assertion
would otherwise pass vacuously.

Not covered automatically: the oversight-manager branch (`_is_oversight_for`),
because the suite authenticates as admin (bypass) and as the employee, both of
which skip it. Verify manually with mode **on** (roster employee → 200) and mode
**off** (same call → **403, not 500**).

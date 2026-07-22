# Employee recommended trainings — design & status reference

Free-text development advice attached to a **person**: "take this course",
"do this internship". Each carries a status the employee moves along and an
`is_active` flag that retires it without deleting it.

Replaces the former `review_session_employees.trainings` — a numbered text blob
on the review record. Like the development missions, this belongs to the person
rather than to one review session, so it survives across sessions and is managed
from the employee card as well as from inside a people review.

## 1. Big picture

```
Employee card  /employees/$employeeId/trainings   (tab, ALWAYS visible)
People review  → the "Trainings" data tab
                 └── both render the SAME <RecommendedTrainingsPanel>

Employee card Trainings tab
├── assigned trainings   <EmployeeTrainingsPanel>     — training MODULE, gated
└── recommended trainings <RecommendedTrainingsPanel> — ALWAYS shown
```

The two blocks are independent on purpose. See §2.

Who does what:

| actor | add | edit text / status | toggle `is_active` | delete |
|---|---|---|---|---|
| the employee themselves | yes | yes | yes | **no** |
| oversight manager (roster-scoped) | yes | yes | yes | yes |
| admin / dev | yes | yes | yes | yes |
| line manager (supervision scope) | read | — | — | — |
| HRM / HRS | read | — | — | — |

**Delete is narrower than write on purpose.** An employee marking a
recommendation inactive keeps the record and the history; letting them delete
would let them erase advice their manager gave them. `is_active` is their exit.

> This is the decisive difference from development missions, where the employee
> may NOT write at all (`EmployeeMissionAccess._is_oversight_for` deliberately
> excludes self). A recommendation is a shared list: the employee may add one for
> themselves and update how far along they are. So self is allowed here.

## 2. Independent of the training module — by design

The training module (`employee_trainings`, `training_types`, eligibility rules)
can be switched off with `training_module_enabled`. Recommended trainings must
stay visible and editable when it is. That single requirement explains three
decisions that would otherwise look like duplication:

| decision | why |
|---|---|
| `description` is free **text**, no `training_type_id` FK | a FK would tie it to the module's catalogue |
| its **own** status lookup, not `employee_training_statuses` | sharing would put `recommended` in the module's own status picker, where it means nothing, and would couple two lifecycles free to diverge |
| its own essence + endpoints | nothing about it should be reachable only while the module is on |

Consequently the employee-card **Trainings tab is no longer gated** on the
module (`EmployeeCardLayout`). The tab is always present; `TrainingsPage` renders
the assigned-trainings block only when the module is on, and the recommended
block always.

## 3. Entities (tables)

| table | purpose | key columns / rules |
|---|---|---|
| `employee_recommended_training_statuses` | lookup | `key` (unique), `description`, `sort_order` |
| `employee_recommended_trainings` | one recommendation | `employee_id` CASCADE, `employee_recommended_training_status_id` RESTRICT, `description`, `is_active`, `sort_order` |

Seeded statuses, in order: **`recommended`** (the default every new row starts
at), `planned`, `in_process`, `passed`.

**No nullable columns.** `is_active` defaults true; `sort_order` is the position
in the employee's list.

`recommended` is resolved **BY KEY** when a new row is created, never by id, so
reseeding the lookup cannot silently repoint every new recommendation. A missing
key raises `RecommendedTrainingStatusKeyNotFound` — a setup error, not a user
error, since the list cannot take a new row without it.

## 4. `is_active` — retire, don't delete

Lists show only active rows unless the reader asks for everything. Nothing is
deleted just because it went stale, so the history survives.

- Read: `GET …/employee/{id}?include_inactive=true` returns everything.
- UI: a small eye icon toggles it. Deliberately an icon, not a filter bar — it
  is rarely used, and the default (current only) is what people want.
- Retired rows render pale + struck through, so they read as history rather than
  as current advice.

## 5. Access control

`employee_recommended_training_access.py` is the single authority. Three levels:

| level | who | method |
|---|---|---|
| **read** | admin/dev, the employee, line manager, oversight-in-roster | `PeopleReviewScopedGuard(VIEW, EMPLOYEE_RECOMMENDED_TRAINING)` on the `/employee/{employee_id}` route; `assert_can_read` on id-keyed routes |
| **write** (add, text, status, `is_active`) | admin/dev, the **employee**, oversight | `assert_can_write` |
| **delete** | admin/dev, oversight only | `assert_can_delete` |

Two subtleties:

- **Roster source is session-independent.** `_is_oversight_for` resolves the
  roster from the process-role holder links, not from `review_session_employees`,
  so a manager can add the first recommendation for someone who has never been in
  a review session. It does depend on the user's **active mode**: with no mode
  selected the backend sees "only myself" and refuses.
- **Id-keyed routes carry no route guard** (`PATCH /{training_id}`,
  `DELETE /{training_id}`) — there is no `{employee_id}` to scope on and ids are
  sequential, so the service resolves the owner from the row first, then applies
  the same check.

The list response also returns a `permissions: {can_write, can_delete}` block.
That is a **UI affordance only** — every write is re-derived server-side.

## 6. API

```
GET    /employee_recommended_trainings/statuses
GET    /employee_recommended_trainings/employee/{employee_id}?include_inactive=
POST   /employee_recommended_trainings/employee/{employee_id}
POST   /employee_recommended_trainings/employee/{employee_id}/reorder
PATCH  /employee_recommended_trainings/{training_id}
DELETE /employee_recommended_trainings/{training_id}
```

`PATCH` is partial — description, status and `is_active` are each separately
optional, so the status pill, the eye toggle and the text can each save on their
own without a read-modify-write.

`reorder` renumbers `sort_order` 0,1,2… from the given ids; ids not belonging to
that employee are ignored rather than trusted, and anything the client did not
mention keeps its relative order at the end.

## 7. Frontend

```
frontend/src/components/employees/trainings/
├── RecommendedTrainingsPanel.tsx   THE shared panel (both hosts render it)
└── recommendedTrainingApi.ts
```

- Status labels follow the project's `<prefix><PascalKey>` convention —
  `recommendedTrainingStatus` + PascalCase key — so a new seeded status needs a
  translation, not a code change.
- Both list variants (active-only, include-inactive) cache separately; the
  2-element query-key prefix invalidates **both** after a write, so toggling the
  eye never shows a stale set.
- Deleting is confirmed through the shared `ConfirmDeleteDialog`. The message
  names the alternative: *"to retire it while keeping the record, mark it as no
  longer relevant instead"* — which matters because for an employee the toggle
  is the only exit.

## 8. TEMPO album

`_tempo_recommended_training_lines()` renders **active** rows as
`• text — status`, appended under the assigned trainings inside the existing
`training_done` dict key — so `tempo_html` / `tempo_pdf` / `tempo_pptx` needed no
edit. It is **not** gated on the training-module switch, unlike
`_tempo_training_lines()` above it.

Same consequence as the missions: re-exporting an album for an OLD session shows
the employee's CURRENT recommendations, not a snapshot of what was recommended
then.

## 9. Migration history

1. `6ddd436a5232` — create `employee_recommended_training_statuses` +
   `employee_recommended_trainings` (alongside the review-results table).
2. `backend/scripts/migrate_results_and_trainings.py` — the data move, run
   **between** revisions 1 and 3. Took the **latest review per employee** with a
   non-empty `trainings` text (`DISTINCT ON`, newest first), split the numbered
   blob into lines, stripped the "1. " prefixes into `sort_order`, and set every
   row to `recommended` + active. Result: **74 employees, 147 recommendations,
   0 unusable texts**. Idempotent, `--dry-run` first. **The script is deleted** —
   with the source column gone it could only fail.
3. `9fc8d31b01a0` — drops `review_session_employees.trainings`.

> **Why the latest review only.** Merging every session's list would resurrect
> advice that a later review had already dropped. Same rule the missions
> migration used, and the reason the move is per-employee rather than per-review.

## 10. Access / essences

`EssenceName.EMPLOYEE_RECOMMENDED_TRAINING` and
`…_RECOMMENDED_TRAINING_STATUS`, granted full CRUD / view to `admin` through
`seed_admin_guards.py` — so an oversight manager's or employee's mistake is
always fixable.

## 11. Consequences worth knowing

- **The employee gained write rights** here, unlike on their development plan.
  Intended: a recommendation is advice to act on, and the employee owning their
  own progress is the point.
- **The trainings tab is now always present** in the employee card. With the
  module off it holds only recommendations.
- **`recommendedTrainings` is a shared translation key** — it already existed for
  the job-side "recommended trainings" (`training_type_job_links`) and reads
  correctly as this panel's heading, so no second key was minted. Note the two
  concepts still share a name in the UI: trainings recommended for a **job** vs.
  recommended to a **person**.

## 12. Not done

- No admin CRUD page for `employee_recommended_training_statuses` (seeded; a
  renamed key would break the `recommended` default resolution).
- No audit trail. Unlike missions there is no `change_log` wiring — if one is
  ever added, the delete-then-insert write strategies elsewhere in this refactor
  would need revisiting, but this essence already upserts per row.
- Manual verification outstanding at the time of writing: the permission
  branches (employee vs oversight vs delete) need a user with an **active
  people-review mode**; the admin bypass user has none.

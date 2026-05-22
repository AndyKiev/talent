# Employee event history — design documentation

## Purpose

This system tracks the full career history of every employee as an ordered
log of discrete events. Each event records exactly what changed and when.
The current state on the `employees` table (plus `employee_departments`) is
always re-derivable by replaying that log in `effective_date` order — so a
date correction by the HRM is correctable without data loss.

---

## Folder structure

Each essence lives in its own package inside `api_v1/employee_events/`,
following the project convention.

```
api_v1/employee_events/
├── employee_event_direction_type/   — seeded lookup: the 4 fundamental change kinds
├── employee_event_type/             — HRM-managed: named career event categories
├── employee_event_type_direction/   — bridge: which directions belong to which event type
├── employee_event_status/           — HRM-managed lookup: event lifecycle statuses (draft, applied)
├── employee_event/                  — parent event instance (one per career event)
├── employee_event_change/           — one direction-change row per direction per event
├── employee_event_change_dept_type/ — seeded lookup: MAIN_DEPT vs RESPONSIBILITY_DEPT
└── employee_event_change_department/— leaf: one row per department touched by a change
```

---

## Tables and their roles

### `employee_event_direction_types`

Seeded, effectively an enum. Defines the four fundamental *kinds* of change
the system understands. Application code and the reapply script switch on
the `code` column.

| id | code                          | name                                 |
|----|-------------------------------|--------------------------------------|
| 1  | `MAIN_DEPT_CHANGE`            | Change of main department            |
| 2  | `JOB_CHANGE`                  | Change of job position               |
| 3  | `RESPONSIBILITY_DEPTS_CHANGE` | Change of responsibility departments |
| 4  | `STATUS_CHANGE`               | Change of employment status          |

**Relationships:** referenced by `employee_event_type_directions` (M) and
`employee_event_changes` (M).

---

### `employee_event_types`

HRM-managed lookup. Each row is a named career event category that appears
in the UI dropdown when creating a new event. Examples: *"Activation"*,
*"Job transfer"*, *"Transfer to another store"*, *"Temporary leave"*,
*"Return from leave"*.

Key columns: `name` (String 128, unique), `description` (Text).

**Relationships:** has many `employee_event_type_directions` (cascade delete),
has many `employee_events`.

---

### `employee_event_type_directions`

Bridge table. Defines which direction types are required (or optional) for a
given event type, and the display order of those direction fields in the HRM
form.

Key columns: `event_type_id` (FK → CASCADE), `direction_type_id` (FK →
RESTRICT), `is_required` (bool, default `true`), `sort_order` (int, default `0`).

Unique constraint: `uq_event_type_direction (event_type_id, direction_type_id)`.

**Guards enforced by the service:**
- Duplicate `(event_type_id, direction_type_id)` pairs raise
  `EmployeeEventTypeDirectionDuplicate` before the INSERT — application-level
  check in addition to the DB unique constraint.
- Only `is_required` and `sort_order` are patchable; `event_type_id` and
  `direction_type_id` are immutable after creation.

**Example — "Activation":**

| sort_order | direction_type              | is_required |
|------------|-----------------------------|-------------|
| 1          | MAIN_DEPT_CHANGE            | true        |
| 2          | JOB_CHANGE                  | true        |
| 3          | RESPONSIBILITY_DEPTS_CHANGE | true        |
| 4          | STATUS_CHANGE               | true        |

**Example — "Temporary leave":**

| sort_order | direction_type | is_required |
|------------|----------------|-------------|
| 1          | STATUS_CHANGE  | true        |

---

### `employee_event_statuses`

HRM-managed lookup. Tracks the lifecycle state of each event.

Key columns: `name` (String 32, unique), `description` (Text).

Expected seed rows:

| name      | description                                      |
|-----------|--------------------------------------------------|
| `draft`   | HRM is still filling in direction changes        |
| `applied` | Changes have been written to the employee record |

**Relationships:** referenced by `employee_events` via `status_id` (FK →
RESTRICT). The model carries an `events` back-ref.

> **Migration note:** the original `status` String column on `employee_events`
> has been removed and replaced with `status_id` (int FK). Two migration
> scripts cover this change:
> - `2026_05_15_1139-060a3389f2a1_employee_events_tables.py` — original tables
> - `2026_05_15_1315-831dd487e19a_employee_events_status.py` — drops `status`,
>   adds `employee_event_statuses` table and `status_id` FK

---

### `employee_events`

One row per career event instance. Created manually by an HRM.

Key columns:

| column           | type      | notes                                                  |
|------------------|-----------|--------------------------------------------------------|
| `employee_id`    | int FK    | The employee this event belongs to                     |
| `event_type_id`  | int FK    | Which named event type this is                         |
| `status_id`      | int FK    | References `employee_event_statuses` (draft / applied) |
| `effective_date` | date      | The date the changes take effect — correctable by HRM  |
| `description`    | text      | Free-text note (optional)                              |
| `created_by`     | int FK    | The HRM employee who created this event                |
| `created_at`     | timestamp | Record creation time — tiebreaker during reapply       |

**Status lifecycle:**

```
draft → applied
```

An event stays in `draft` while the HRM is filling in direction-change rows.
Transitioning to `applied` writes the changes to the employee record via the
`/apply` endpoint. Only applied events are considered by the reapply script.

**Guards enforced by the service:**
- `PATCH /{employee_id}/events/{event_id}` is blocked unless `status.name == "draft"`.
- `DELETE /{employee_id}/events/{event_id}` is blocked unless `status.name == "draft"`.
- Applying an already-applied event raises `EmployeeEventAlreadyApplied`.

**Reapply ordering:** events are replayed in `(effective_date ASC, created_at ASC)` order.

---

### `employee_event_changes`

One row per direction type within a parent event. Stores the previous and
new value for scalar changes (job, status, main department). Multi-valued
responsibility-department changes are stored in child rows (see below).

Key columns:

| column               | type   | populated when          |
|----------------------|--------|-------------------------|
| `event_id`           | int FK | always (CASCADE delete) |
| `direction_type_id`  | int FK | always (RESTRICT)       |
| `prev_job_id`        | int FK | JOB_CHANGE              |
| `new_job_id`         | int FK | JOB_CHANGE              |
| `prev_status_id`     | int FK | STATUS_CHANGE           |
| `new_status_id`      | int FK | STATUS_CHANGE           |
| `prev_department_id` | int FK | MAIN_DEPT_CHANGE        |
| `new_department_id`  | int FK | MAIN_DEPT_CHANGE        |

All job/status/department FKs use `ondelete="SET NULL"`.

**Guards enforced by the service:**
- Create/update/delete is blocked when the parent event is not `draft`.
- One change row per `direction_type_id` per event is enforced
  (`EmployeeEventChangeDirectionDuplicate`).

---

### `employee_event_change_dept_types`

Seeded lookup. Distinguishes the two roles a department row can play inside
`employee_event_change_departments`.

| id | code                  | name                      |
|----|-----------------------|---------------------------|
| 1  | `MAIN_DEPT`           | Main department           |
| 2  | `RESPONSIBILITY_DEPT` | Responsibility department |

---

### `employee_event_change_departments`

Leaf table. One row per department involved in a change row.

Key columns: `event_change_id` (FK → CASCADE), `department_id` (FK →
RESTRICT), `change_dept_type_id` (FK → RESTRICT).

Unique constraint: `(event_change_id, department_id, change_dept_type_id)`.

---

## API surface

Event and change endpoints are nested under `/employees/{employee_id}/`:

```
GET    /employees/{employee_id}/events
POST   /employees/{employee_id}/events
GET    /employees/{employee_id}/events/{event_id}
PATCH  /employees/{employee_id}/events/{event_id}
DELETE /employees/{employee_id}/events/{event_id}
POST   /employees/{employee_id}/events/{event_id}/apply

GET    /employees/{employee_id}/events/{event_id}/changes
POST   /employees/{employee_id}/events/{event_id}/changes
GET    /employees/{employee_id}/events/{event_id}/changes/{change_id}
PATCH  /employees/{employee_id}/events/{event_id}/changes/{change_id}
DELETE /employees/{employee_id}/events/{event_id}/changes/{change_id}
```

Type-direction endpoints are nested under `/employee_event_types/{event_type_id}/`:

```
GET    /employee_event_types/{event_type_id}/directions
POST   /employee_event_types/{event_type_id}/directions
GET    /employee_event_types/{event_type_id}/directions/{direction_id}
PATCH  /employee_event_types/{event_type_id}/directions/{direction_id}
DELETE /employee_event_types/{event_type_id}/directions/{direction_id}
```

Flat lookup/admin endpoints:

```
GET/POST/PATCH/DELETE  /employee_event_statuses/{id?}
GET/POST/PATCH/DELETE  /employee_event_types/{id?}
GET/POST/PATCH/DELETE  /employee_event_direction_types/{id?}
```

> **Router wiring note:**
> - `employee_event_views.router` and `employee_event_change_views.router`
>   must be included with `prefix="/employees"` on the main router.
> - `employee_event_type_direction_views.router` must be included with
>   `prefix="/employee_event_types"` on the main router.

---

## Pydantic schema summary

| Schema class                            | Used for                                          |
|-----------------------------------------|---------------------------------------------------|
| `EmployeeEventDirectionType`            | Read — seeded lookup row                          |
| `EmployeeEventStatusSchema`             | Read — status lookup row                          |
| `EmployeeEventType`                     | Read — includes nested `type_directions`          |
| `EmployeeEventTypeCreate/Update`        | Write — event type CRUD                           |
| `EmployeeEventTypeDirectionNested`      | Embedded inside `EmployeeEventType`               |
| `EmployeeEventTypeDirection`            | Read — standalone direction-slot row              |
| `EmployeeEventTypeDirectionCreate`      | Write — add a direction slot to an event type     |
| `EmployeeEventTypeDirectionUpdate`      | Write — patch `is_required` / `sort_order` only   |
| `EmployeeEventChangeDeptType`           | Read — seeded lookup row                          |
| `EmployeeEventChangeDepartmentSchema`   | Read — one dept row within a change               |
| `EmployeeEventChangeDepartmentCreate`   | Write — submitted as part of change creation      |
| `EmployeeEventChangeSchema`             | Read — full change row with all resolved FKs      |
| `EmployeeEventChangeCreate`             | Write — submitted as part of event creation       |
| `EmployeeEventChangeUpdate`             | Write — patch scalar FK fields on an existing row |
| `EmployeeEventSchema`                   | Read — full event with all changes nested         |
| `EmployeeEventFlat`                     | Read — slim event for list endpoints              |
| `EmployeeEventCreate`                   | Write — full event + changes in one payload       |
| `EmployeeEventUpdate`                   | Write — patch header fields only                  |

### Forward-reference rule

All schemas that reference types from sibling packages must place those
imports **after** the class definitions and **outside** `TYPE_CHECKING`, so
that `model_rebuild()` can resolve them at module load time. The
`TYPE_CHECKING` guard is reserved for ORM model files only.

---

## File completion status

| Essence                          | model | schema | repo | service | errors | success | deps | views |
|----------------------------------|:-----:|:------:|:----:|:-------:|:------:|:-------:|:----:|:-----:|
| employee_event_direction_type    | ✓     | ✓      | ✓    | ✓       | ✓      | ✓       | ✓    | ✓     |
| employee_event_type              | ✓     | ✓      | ✓    | ✓       | ✓      | ✓       | ✓    | ✓     |
| employee_event_type_direction    | ✓     | ✓      | ✓    | ✓       | ✓      | ✓       | ✓    | ✓     |
| employee_event_status            | ✓     | ✓      | ✓    | ✓       | ✓      | ✓       | ✓    | ✓     |
| employee_event                   | ✓     | ✓      | ✓    | ✓       | ✓      | ✓       | ✓    | ✓     |
| employee_event_change            | ✓     | ✓      | ✓    | ✓       | ✓      | ✓       | ✓    | ✓     |
| employee_event_change_dept_type  | ✓     | ✓      | —    | —       | —      | —       | —    | —     |
| employee_event_change_department | ✓     | ✓      | —    | —       | —      | —       | —    | —     |

`—` = model/schema only; managed exclusively through parent endpoints.

---

## `employee_model.py` patch

Add to the `TYPE_CHECKING` block:

```python
from backend.api_v1.employee_events.employee_event.employee_event_model import EmployeeEvent
```

Add to the `Employee` class body (after `departments`):

```python
events: Mapped[list["EmployeeEvent"]] = relationship(
    foreign_keys="[EmployeeEvent.employee_id]",
    back_populates="employee",
    lazy="selectin",
)
created_events: Mapped[list["EmployeeEvent"]] = relationship(
    foreign_keys="[EmployeeEvent.created_by]",
    back_populates="creator",
    lazy="selectin",
)
```

The `foreign_keys` string form is required because both FKs on `EmployeeEvent`
point to `employees` and SQLAlchemy cannot resolve the ambiguity without it.

---

## Seed data required

**`employee_event_direction_types`**
```sql
INSERT INTO employee_event_direction_types (code, name) VALUES
  ('MAIN_DEPT_CHANGE',            'Change of main department'),
  ('JOB_CHANGE',                  'Change of job position'),
  ('RESPONSIBILITY_DEPTS_CHANGE', 'Change of responsibility departments'),
  ('STATUS_CHANGE',               'Change of employment status');
```

**`employee_event_statuses`**
```sql
INSERT INTO employee_event_statuses (name, description) VALUES
  ('draft',   'HRM is still filling in direction changes'),
  ('applied', 'Changes have been written to the employee record');
```

**`employee_event_change_dept_types`**
```sql
INSERT INTO employee_event_change_dept_types (code, name) VALUES
  ('MAIN_DEPT',           'Main department'),
  ('RESPONSIBILITY_DEPT', 'Responsibility department');
```

---

## Reapply script — logic outline

```python
async def reapply_events(employee_id: int, session: AsyncSession) -> None:
    events = await session.execute(
        select(EmployeeEvent)
        .where(
            EmployeeEvent.employee_id == employee_id,
            EmployeeEvent.status.has(name="applied"),
        )
        .order_by(EmployeeEvent.effective_date.asc(), EmployeeEvent.created_at.asc())
    )

    for event in events.scalars():
        for change in event.changes:
            code = change.direction_type.code

            if code == "JOB_CHANGE":
                employee.job_id = change.new_job_id

            elif code == "STATUS_CHANGE":
                employee.status_id = change.new_status_id

            elif code == "MAIN_DEPT_CHANGE":
                await upsert_main_department(employee_id, change.new_department_id, session)

            elif code == "RESPONSIBILITY_DEPTS_CHANGE":
                await replace_responsibility_departments(
                    employee_id,
                    [d.department_id for d in change.dept_changes
                     if d.change_dept_type.code == "RESPONSIBILITY_DEPT"],
                    session,
                )

    await session.commit()
```

Key points:
- Only `applied` events are replayed (filtered via the `status` relationship).
- Replay order is `effective_date ASC, created_at ASC`.
- The script is idempotent — running it twice produces the same result.
- A corrected `effective_date` causes the event to slot into its new position
  in the sequence, restoring correct current state automatically.

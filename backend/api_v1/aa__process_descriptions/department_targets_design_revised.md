# Department Targets Design (Revised)

## Business Rules

We have exactly 2 talent statuses:

- PA
- PO

Each `job_group` defines how targets are managed:

- one target for both statuses together
OR
- separate targets per status

The business logic belongs to the `job_group`.

The design avoids nullable `talent_status_id` fields.

---

# Tables

## 1. talent_statuses

```sql
talent_statuses
---------------
id
key
name
description
```

Example:

| id | key |
|----|-----|
| 1  | PA  |
| 2  | PO  |

---

## 2. target_logic_types

Defines how targets are entered.

```sql
target_logic_types
------------------
id
key
name
description
```

Example values:

| id | key |
|----|------|
| 1  | combined |
| 2  | per_status |

Meaning:

- `combined`
  - one target for PA + PO together
- `per_status`
  - separate targets for PA and PO

---

## 3. job_groups

```sql
job_groups
----------
id
key
name
description
target_logic_type_id
```

Example:

| job_group | logic |
|------------|------------|
| Directors | combined |
| Cashiers | per_status |

This keeps target behavior directly attached to the job group.

---

## 4. department_categories

```sql
department_categories
---------------------
id
name
```

Example:

| id | name |
|----|------|
| 1 | directorate |
| 2 | hypermarket |

---

## 5. departments

Recursive structure.

```sql
departments
-----------
id
parent_id
department_category_id
type_id
name
...
```

Only departments with category:

- directorate
- hypermarket

can have targets.

---

# Why We Need Status Sets

Although only two statuses currently exist:

- PA
- PO

we still need a structure representing:

- PA alone
- PO alone
- PA + PO together

This avoids:

- nullable `talent_status_id`
- special-case rows
- inconsistent logic

The set becomes an explicit business entity.

---

# Status Set Tables

## 6. target_status_sets

Represents allowed status combinations.

```sql
target_status_sets
------------------
id
key
name
description
```

Example:

| id | key |
|----|----------------|
| 1  | PA_ONLY |
| 2  | PO_ONLY |
| 3  | PA_PO |

---

## 7. target_status_set_items

Many-to-many relation.

```sql
target_status_set_items
-----------------------
target_status_set_id
talent_status_id
```

Example:

| target_status_set_id | talent_status_id |
|----------------------|------------------|
| 1 | PA |
| 2 | PO |
| 3 | PA |
| 3 | PO |

Meaning:

```text
PA_PO = [PA, PO]
```

---

# Main Table

## 8. department_targets

```sql
department_targets
------------------
id
department_id
job_group_id
period_id
target_status_set_id
target
created_at
updated_at
```

---

# How It Works

## CASE 1 — combined logic

If job group uses:

```text
combined
```

then only ONE row exists.

Example:

| department | job_group | period | target_status_set | target |
|---|---|---|---|---|
| HM1 | Directors | 2026Q1 | PA_PO | 10 |

Meaning:

```text
PA + PO together = 10
```

---

## CASE 2 — per_status logic

If job group uses:

```text
per_status
```

then TWO rows exist.

Example:

| department | job_group | period | target_status_set | target |
|---|---|---|---|---|
| HM1 | Cashiers | 2026Q1 | PA_ONLY | 4 |
| HM1 | Cashiers | 2026Q1 | PO_ONLY | 7 |

Meaning:

```text
PA = 4
PO = 7
```

---

# Recommended Constraints

## Unique constraint

```sql
UNIQUE (
    department_id,
    job_group_id,
    period_id,
    target_status_set_id
)
```

---

# Recommended Application Validation

## For combined logic

Require:

- exactly 1 row
- target_status_set = PA_PO

---

## For per_status logic

Require:

- exactly 2 rows
- PA_ONLY
- PO_ONLY

---

# Why This Design Is Better

Compared to nullable `talent_status_id`:

- cleaner relational model
- no special-case NULL handling
- easier long-term extensibility
- explicit business meaning
- safer constraints

Even with only two statuses today, this structure keeps the model consistent and future-proof.

If later you add:

- additional statuses
- grouped statuses
- configurable combinations

the schema will already support it without redesign.

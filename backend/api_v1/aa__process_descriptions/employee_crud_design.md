# Employee CRUD — Design Document

## Overview

Creating or editing an employee involves two coordinated writes:

1. **`POST /employees`** — creates the `Employee` row (`code`, `name`, `email?`, `job_id`, `lang_id=3`, `status_id=1`, `is_active=true`)
2. **`POST /employees/{id}/departments`** — attaches the chosen department as the main department (`is_main=true`)

Both calls are orchestrated inside a single `mutationFn` in `useEmployeeMutations.createMutation`.

---

## Data Model Relationships

```
DepartmentCategory (id, name)
    └── Department (id, name, department_type_id, department_category_id, ...)
            └── DepartmentType (id, name)
                    └── DepartmentTypeJobLink (department_type_id, job_id)
                            └── Job (id, name)

Employee (id, code, name, email?, job_id, lang_id, status_id, is_active)
    └── EmployeeDepartment (employee_id, department_id, is_main)
```

---

## Frontend File Structure

```
src/components/employees/
├── employeeApi.ts                  # fetchEmployees, createEmployee, updateEmployee,
│                                   #   updateEmployeeJob, deleteEmployee
├── employeeDepartmentApi.ts        # fetchEmployeeDepartments, countEmployeeDepartments,
│                                   #   createEmployeeDepartment, deleteEmployeeDepartment
├── jobsByDepartmentTypeApi.ts      # fetchJobsByDepartmentType
├── EmployeesPage.tsx               # DataGrid list page; 3 action icons per row:
│                                   #   ApartmentIcon → drawer, EditIcon → edit dialog,
│                                   #   DeleteIcon → delete dialog
├── EmployeeCreateDialog.tsx        # Full create form (code, name, email, is_active +
│                                   #   3-step cascade: category → department → job)
├── EmployeeEditDialog.tsx          # Edit name/email/is_active only; code+job read-only
├── EmployeeDeleteDialog.tsx        # Confirm delete with code+name chips
├── EmployeeAddDeptJobDialog.tsx    # Reusable cascade dialog used in two modes:
│                                   #   "add_department" — job locked to current job_id
│                                   #   "change_job"     — job editable, shows warning
├── EmployeeDepartmentsDrawer.tsx   # Right-side drawer: lists EmployeeDepartment records,
│                                   #   delete per row (blocked for is_main=true),
│                                   #   "Add Department" + "Change Job" buttons in footer
├── useEmployeeColumns.tsx          # DataGrid column defs
└── useEmployeeMutations.ts         # createMutation (2 calls), updateMutation, deleteMutation
```

---

## Cascading Select Logic (shared by create + add dept + change job)

### Step 1 — Category
- `GET /api/v1/admin/department_categories`
- On change → clears department + job

### Step 2 — Department
- `GET /api/v1/departments?department_category_id={id}`
- Disabled until category chosen
- On change → derives `department_type_id`, clears job

### Step 3 — Job
- `GET /api/v1/department_type_job_links/by_department_type/{typeId}/jobs?is_active=true`
- Returns `JobWithLinkId[]` (`id`, `name`, `link_id`, `link_is_active`)
- Disabled until department chosen
- If no jobs linked → shows error helper + Alert + disables submit

---

## Form Fields

| Field | Create | Edit | AddDept | ChangeJob |
|---|---|---|---|---|
| `code` | ✅ input | 🔒 read-only chip | — | — |
| `name` | ✅ input | ✅ input | — | — |
| `email` | ✅ optional | ✅ optional | — | — |
| `is_active` | ✅ toggle | ✅ toggle | — | — |
| `lang_id` | hardcoded 3 | — | — | — |
| `department_category_id` | ✅ select | — | ✅ select | ✅ select |
| `department_id` | ✅ select | — | ✅ select | ✅ select |
| `job_id` | ✅ select | 🔒 read-only chip | 🔒 auto from type | ✅ select |
| `is_main` | always true | — | ✅ toggle (default true) | ✅ toggle |

---

## EmployeeAddDeptJobDialog — Two Modes

### `add_department`
- Job select is **not rendered** — job is locked to `employee.job_id`.
- After department is selected, the job list for that dept type is fetched.
- If `employee.job_id` is **in** the list → auto-selected silently.
- If `employee.job_id` is **not in** the list → error shown, submit blocked.
  - User must use "Change Job" mode instead.
- Always creates a new `EmployeeDepartment` record.

### `change_job`
- Job select **is rendered** and editable.
- If selected `job_id !== employee.job_id` → yellow warning Alert shown.
- Warning includes a confirmation toggle (`"I understand — proceed with job change"`).
- Submit is blocked until toggle is checked.
- On submit: creates `EmployeeDepartment` **and** calls `PATCH /employees/{id}/job/{job_id}`.

---

## EmployeeDepartmentsDrawer

- Opens from the **ApartmentIcon** action button in the grid.
- Shows current job chip in a banner at the top.
- Lists all `EmployeeDepartment` records with:
  - ⭐ star icon: filled = `is_main`, outline = responsibility dept
  - Department name, category chip, type chip, created date
  - Delete button — **disabled and tooltip-blocked** for `is_main=true` records
- Footer has two buttons:
  - **Add Department** → opens `EmployeeAddDeptJobDialog` in `add_department` mode
  - **Change Job** → opens `EmployeeAddDeptJobDialog` in `change_job` mode
- All mutations invalidate both `['employee_departments', id]` and `['employees']` cache keys.

---

## API Reference

| Purpose | Method | URL |
|---|---|---|
| List employees | GET | `/api/v1/employees` |
| Create employee | POST | `/api/v1/employees` |
| Update employee (name/email/active) | PATCH | `/api/v1/employees/{id}` |
| Update employee job | PATCH | `/api/v1/employees/{id}/job/{job_id}` |
| Delete employee | DELETE | `/api/v1/employees/{id}` |
| List department categories | GET | `/api/v1/admin/department_categories` |
| List departments by category | GET | `/api/v1/departments?department_category_id={id}` |
| List jobs by department type | GET | `/api/v1/department_type_job_links/by_department_type/{typeId}/jobs?is_active=true` |
| Create employee–department link | POST | `/api/v1/employees/{id}/departments` |
| List employee departments | GET | `/api/v1/employees/{id}/departments` |
| Count employee departments | GET | `/api/v1/employees/{id}/departments/count` |
| Delete employee–department link | DELETE | `/api/v1/employees/{id}/departments/{linkId}` |

---

## Query Cache Keys

```ts
EMPLOYEES_QK               = ['employees']
DEPT_QK(employeeId)        = ['employee_departments', employeeId]

// Invalidated by:
// createMutation           → EMPLOYEES_QK
// updateMutation           → EMPLOYEES_QK
// deleteMutation           → EMPLOYEES_QK
// addMutation (drawer)     → DEPT_QK + EMPLOYEES_QK
// deleteMutation (drawer)  → DEPT_QK + EMPLOYEES_QK
```

---

## is_main Constraint

The backend (`employee_department_service.py`) enforces:
- `_assert_main_constraint` → blocks a second `is_main=true` assignment
- `_ensure_not_main_before_delete` → blocks deletion of the main assignment

The drawer disables the delete button on `is_main=true` rows with a tooltip explaining why, matching the backend rule.

### Pending addition to `employee_department_errors.py`

```python
class EmployeeDepartmentMainJobConflictError(DomainError):
    message_key = "employeeDepartmentMainJobConflict"

    def __init__(self, employee_id: int, current_job_id: int) -> None:
        self.template_vars = {"employeeId": employee_id, "jobId": current_job_id}
        self.fallback = (
            f"Employee {employee_id} already has a main department linked to job "
            f"{current_job_id}. An employee can have only one job."
        )
        super().__init__(self.fallback)
```

---

## Translation Keys Needed

| Key | UKR | ENG |
|---|---|---|
| `employeeDeleteSuccess` | `Співробітника '${name}' успішно видалено` | `Employee '${name}' successfully deleted` |
| `employeeDeleteError` | `Співробітника '${code}' неможливо видалити — пов'язаний з іншими записами` | `Employee '${code}' cannot be deleted because it is referenced by other records` |
| `employeeNotFound` | `Співробітника з ID ${employeeId} не знайдено` | `Employee with ID ${employeeId} not found` |
| `employeeNotFoundByCode` | `Співробітника з кодом '${code}' не знайдено` | `Employee with code '${code}' not found` |
| `employeeCodeTaken` | `Співробітник з кодом '${code}' вже існує` | `Employee with code '${code}' already exists` |
| `employeeEmailTaken` | `Співробітник з email '${email}' вже існує` | `Employee with email '${email}' already exists` |
| `employeeOrgUnitDepartmentCreateSuccess` | `Призначення '${name}' успішно створено` | `Assignment '${name}' successfully created` |
| `employeeOrgUnitDepartmentDeleteSuccess` | `Призначення '${name}' успішно видалено` | `Assignment '${name}' successfully deleted` |
| `employeeOrgUnitDepartmentUpdateSuccess` | `Призначення '${name}' успішно оновлено` | `Assignment '${name}' successfully updated` |
| `employeeDepartmentMainAlreadyExists` | `Співробітник вже має основний підрозділ (ID: ${existingMainId})` | `Employee already has a main department (ID: ${existingMainId})` |
| `employeeDepartmentMainDeleteError` | `Неможливо видалити основний підрозділ (ID: ${linkId})` | `Cannot delete main department (ID: ${linkId}). Set another as main first.` |
| `employeeDepartmentMainJobConflict` | `Співробітник вже має основний підрозділ з посадою ${jobId}` | `Employee already has a main department linked to job ${jobId}` |

---

## Open Questions / Future Work

1. **Atomic create endpoint** — `POST /employees/with_department` wrapping both writes in one DB transaction.
2. **Multiple main departments** — currently blocked by backend. Future: allow "store" + "directorate" category departments both as `is_main=true` once access roles are in place.
3. **Job change via employee events** — `change_job` mode in the drawer is a temporary admin bypass; once employee events are implemented, this path should be restricted to HR roles or removed.
4. **Responsibility departments** (`is_main=false`) — out of scope for this iteration; drawer already shows them with a hollow star for when they are implemented.
5. **Status field** — `status_id=1` hardcoded on create; transitions driven by employee events.
6. **Department chip in grid** — currently the grid shows `job` chip. Adding a department chip is deferred until the grid column for it is designed (one employee can have multiple — consider showing the main one only).

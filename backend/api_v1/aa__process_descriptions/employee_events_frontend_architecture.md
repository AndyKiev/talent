# Employee Events Frontend Architecture

Your backend design is already very solid — especially the event replay/history model.
What you need now is mostly a good frontend mental model for HRM workflows.

You can think about it almost like:

```text
Employee profile → Event history tab → Spreadsheet-like event editor
```

---

# High-level frontend flow

```text
Employees List
    ↓
Employee Details
    ↓
Employee Events History
    ↓
Create / Edit Event
    ↓
Apply Event
```

Example URLs:

```txt
/employees
/employees/1
/employees/1/events
/employees/1/events/new
/employees/1/events/55
```

This is VERY compatible with TanStack Router nested routing.

---

# Recommended TanStack Router structure

Something like this:

```txt
src/
├── routes/
│   ├── employees/
│   │   ├── index.tsx                -> employees list
│   │   ├── $employeeId/
│   │   │   ├── index.tsx            -> employee overview
│   │   │   ├── events/
│   │   │   │   ├── index.tsx        -> events table/history
│   │   │   │   ├── new.tsx          -> create event
│   │   │   │   ├── $eventId/
│   │   │   │   │   ├── index.tsx    -> event details
│   │   │   │   │   ├── edit.tsx
```

This gives you:

```txt
/employees/1/events
/employees/1/events/new
/employees/1/events/15/edit
```

Very clean.

---

# Visual mental model

I’d structure the UI in 3 layers.

---

# 1. Employees Table

Simple HRM table.

```txt
------------------------------------------------
| Name        | Position   | Status | Actions |
------------------------------------------------
| John Smith  | Cashier    | Active | View    |
| Anna Lee    | Manager    | Leave  | View    |
------------------------------------------------
```

Clicking "View":

```txt
/employees/1
```

---

# 2. Employee Profile Page

Tabs work VERY well here.

```txt
-------------------------------------------------
| Employee: John Smith                          |
-------------------------------------------------
| Overview | Events | Departments | Documents   |
-------------------------------------------------
```

The important tab:

```txt
Events
```

---

# 3. Events History Screen

THIS is the core screen.

Think:

- Excel
- audit history
- HR timeline
- changelog

Something like:

```txt
----------------------------------------------------------------------
| Date       | Event Type        | Status   | Created By | Actions   |
----------------------------------------------------------------------
| 2026-05-01 | Promotion         | Applied  | Alice HR   | View      |
| 2026-04-12 | Transfer          | Draft    | Alice HR   | Edit      |
| 2026-03-01 | Temporary Leave   | Applied  | Bob HR     | View      |
----------------------------------------------------------------------
```

This is:

```txt
/employees/1/events
```

---

# Very important UX idea

You should probably support:

## A. Table view

Good for HRM daily work.

## B. Timeline view

Good for understanding history visually.

Example:

```txt
2024 ───── Hired
2025 ───── Promotion
2025 ───── Transfer to Store #5
2026 ───── Temporary Leave
```

This becomes EXTREMELY powerful because your backend is event-driven.

---

# Event Details Screen

This is where your backend design shines.

Example:

```txt
Event: Promotion
Status: Draft
Effective Date: 2026-05-01
```

Then:

```txt
Changes
------------------------------------------------
| Direction               | Previous | New     |
------------------------------------------------
| JOB_CHANGE              | Cashier  | Senior  |
| MAIN_DEPT_CHANGE        | Store 1  | Store 3 |
------------------------------------------------
```

---

# BEST frontend concept for your model

Your backend already models:

```txt
event_type
    ↓
allowed directions
```

So frontend should dynamically render forms.

Example:

## "Temporary Leave"

Backend says:

```txt
STATUS_CHANGE only
```

Frontend auto-renders:

```txt
Previous Status
New Status
```

---

## "Transfer"

Backend says:

```txt
MAIN_DEPT_CHANGE
RESPONSIBILITY_DEPTS_CHANGE
```

Frontend auto-renders:

```txt
Old Department
New Department

Responsibilities:
[ x ] Bakery
[ x ] Storage
```

This is SUPER scalable.

---

# React component structure

Rough idea:

```txt
components/
├── employee_events/
│   ├── EventTable.tsx
│   ├── EventTimeline.tsx
│   ├── EventForm.tsx
│   ├── EventChangeRow.tsx
│   ├── DynamicDirectionFields.tsx
│   ├── ApplyEventButton.tsx
```

---

# The most important frontend architecture decision

You basically have 2 options.

---

# OPTION 1 — Spreadsheet-like UI

Very HR-friendly.

Like:

| Date | Type | New Dept | New Job | Status |

Pros:
- fast
- familiar
- Excel feeling

Cons:
- harder validation
- complicated dynamic fields

Good if:
- HRM edits MANY events quickly

---

# OPTION 2 — Event Drawer / Modal (recommended)

Table of events + click row → side panel opens.

Example:

```txt
---------------------------------------------------
| Events Table                                    |
---------------------------------------------------
| Promotion | Applied |
| Transfer  | Draft   |
---------------------------------------------------

                    → opens side panel

------------------------------------
| Event Details                    |
------------------------------------
| Effective Date                   |
| Event Type                       |
| Dynamic Change Fields            |
| Save                             |
| Apply                            |
------------------------------------
```

Pros:
- cleaner
- easier validation
- easier dynamic rendering
- easier permissions
- easier mobile responsiveness

This is probably best.

---

# Visualization ideas

Since your data is temporal, visualizations become powerful.

---

## Timeline Visualization

Very valuable.

```txt
Hire ─ Promotion ─ Transfer ─ Leave ─ Return
```

---

## Department Movement Graph

```txt
Store A → Store B → Store C
```

---

## Current vs Historical Snapshot

```txt
Current Position:
Senior Manager

Derived from:
- Promotion event
- Transfer event
- Status event
```

This matches your replay architecture perfectly.

---

# Suggested state management

You probably do NOT need Redux.

This stack is enough:

```txt
TanStack Router
TanStack Query
React Hook Form
Zod
```

Very modern.

---

# Best UX pattern for applying events

Drafts are important.

I’d make:

```txt
Draft → editable
Applied → read-only
```

Visually:

```txt
🟡 Draft
🟢 Applied
```

And:

```txt
[ Apply Event ]
```

button only for drafts.

---

# If I were designing this system

I would do:

```txt
Employees Page
    ↓
Employee Profile
    ↓
Events Tab
    ↓
Table + Timeline Toggle
    ↓
Drawer-based Event Editor
```

This gives:
- scalability
- auditability
- HR familiarity
- clean routing
- easy future analytics

And it fits your backend architecture VERY naturally.


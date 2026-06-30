# TASKS (mailbox)

Rules for the worker agent:
- Read each task block below.
- If status is TODO: do the task, then write your output into results.md
  under the SAME task number, and change this task's status to DONE.
- Do NOT touch tasks already marked DONE.
- One task = one block. Format is fixed. Do not change the format.

---

## task 1
status: DONE
request: (no task yet — this is a test placeholder. Reply "ready" in results.md task 1 and set this to DONE.)

---

## task 2
status: OBSOLETE
request: (read-only test — superseded, skip.)

---

## task 3
status: DONE
request: |
  FRONTEND FEATURE — People-review supervision department select.

  GOAL
  When a supervisor (people-review role with link_target === 'department') turns
  on supervision mode for a given review SESSION, the department <Select> in
  ScopeSettings must cross-check the supervisor's supervised departments against
  the SESSION's target department(s) and:
    - AUTOSELECT the department when EXACTLY ONE supervised dept matches the session.
    - ENABLE every matching supervised dept (selectable), and HARD-DISABLE every
      non-matching one (visible but not selectable) with an on-hover tooltip hint
      explaining it is not part of this review session.
    - If MULTIPLE match: enable all matches, do NOT autoselect (user picks).
    - If NONE match (full mismatch): all options visible but ALL disabled + hint.

  MATCH RULE (decided): EXACT department id match only. A supervised department is
  "matching" iff its id is literally present in the session's department-id list.
  No subtree/descendant logic. Do not implement tree matching.

  FILES
    - frontend/src/components/people-review/ScopeSettings.tsx   (the select lives here, lines ~167-182)
    - frontend/src/components/people-review/SessionEmployeesPage.tsx  (renders <ScopeSettings/> at line ~435; has sessionId via useParams)
    - frontend/src/components/people-review/peopleReviewApi.ts  (add the session-departments fetch here)
  Backend already has the data:
    - backend/api_v1/review_session/review_session_model.py  -> ReviewSession.departments (many) relationship to ReviewSessionDepartment
    - There is also a legacy single department_id / department_name on the session.
    - Confirm which endpoint returns the session's department id LIST. If the existing
      ReviewSessionList schema only exposes department_name (singular), you must expose
      the department id list. Prefer the LEAST invasive option: if review_session_department
      already has a GET endpoint returning rows for a session, use it. Otherwise add a thin
      read endpoint or extend the session read schema with department_ids: list[int].
      Do NOT hand-write an alembic migration; no schema/table change is needed (the table
      exists). If you think a migration is needed, STOP and report why instead.

  WIRING (decided)
    - Fetch the session's department id list with a SEPARATE query (TanStack useQuery)
      keyed off sessionId. Pass the resulting number[] into <ScopeSettings/> as a NEW
      OPTIONAL prop, e.g. sessionDepartmentIds?: number[].
    - ScopeSettings is SHARED across pages and is sometimes rendered with NO session
      context. The prop MUST be optional. When it is undefined OR empty, behave EXACTLY
      as today: nothing disabled, and the existing single-dept autoselect (deptFor,
      lines ~72-75) is unchanged.

  AUTOSELECT BEHAVIOUR
    - Today deptFor(roleId) auto-picks only when the supervisor has exactly ONE supervised
      dept. New rule layered on top: when sessionDepartmentIds is provided & non-empty,
      compute the matching supervised depts (exact id intersection). If exactly one matches,
      autoselect THAT one (even if the supervisor supervises several). Trigger the autoselect
      when supervision mode becomes active for this session (same moment deptFor is used in
      setMode, line ~84) AND also if the user is already in supervision mode with no dept
      picked. Avoid clobbering a department the user manually picked.

  DISABLED-OPTION UI
    - Each <MenuItem> for a non-matching dept: disabled + wrapped so an on-hover Tooltip
      shows the hint (MUI disabled MenuItem swallows hover; wrap the inner content in a
      <Tooltip><span>…</span></Tooltip> or equivalent so the tooltip still fires).

  TRANSLATIONS
    - Any NEW user-facing string (e.g. the disabled hint "This department is not part of
      this review session") MUST go through getString('key') — do NOT hardcode display text,
      do NOT add to str.ts. If you add a new key, list the key + EN + UK text in your
      results.md answer so it can be imported into the DB. Do NOT create a translations.json
      file.

  CONSTRAINTS
    - No TypeScript `any`. Every <Select> keeps an explicit variant prop.
    - Endpoint paths use underscores, never dashes.
    - Do NOT run the dev servers. Do NOT create or run alembic migrations.
    - Keep ScopeSettings working on pages that pass no session prop.

  DELIVERABLE in results.md task 3:
    1. List every file you changed and a 1-line summary per file.
    2. Paste the full final content of ScopeSettings.tsx.
    3. Paste the diff/new code for peopleReviewApi.ts and SessionEmployeesPage.tsx.
    4. State exactly how you got the session's department id list (which endpoint/schema),
       and whether you had to touch the backend.
    5. List any new translation keys (key + EN + UK).
    6. Note anything you were unsure about.
  Then set this task to DONE.

---

## task 4
status: DONE
request: |
  FIX-UPS to your task 3 work. Three issues found in review. The feature design is
  correct and accepted — these are correctness fixes, do not redesign.

  4a. CRITICAL — Rules-of-Hooks crash (BLOCKER).
    In ScopeSettings.tsx you placed the new `useEffect` (autoselect) AFTER the early
    `if (roles.length === 0) return null;`. That early return sits ABOVE the useEffect.
    On first render `scopes` is undefined → roles = [] → the component returns null
    BEFORE registering the useEffect (5 hooks). When the scopes query resolves and the
    user has roles, execution reaches the useEffect (6 hooks). React then throws
    "Rendered more hooks than during the previous render" and the component crashes.
    This is the NORMAL load path for every role-holding user, not an edge case.
    FIX: move `if (roles.length === 0) return null;` DOWN to immediately before the
    JSX `return (` statement. All the const derivations in between are already safe
    with empty scopes (they use `?? []`), and the useEffect self-guards via
    hasSessionDepts. Do NOT hoist the useEffect up. Just move the early return down.
    Verify hook order is now identical on every render.

  4b. Disabled-hint translation renders the raw key.
    The hint uses `getString('deptNotInSession') || 'fallback'`. In THIS codebase
    getString returns the KEY ITSELF on a miss (see roleLabel in the same file:
    `translated !== key`). The key string is truthy, so the `|| 'fallback'` NEVER
    fires — until the key is in the DB, the tooltip shows the literal text
    "deptNotInSession". You do NOT need to change the code (the getString call is
    correct). Instead, RE-CONFIRM in results.md the exact key + EN + UK so it gets
    imported to the DB. Key: deptNotInSession. Just restate it clearly so it is not
    forgotten; the import is done on our side.

  4c. Tooltip-wrapped disabled MenuItem inside <Select> — needs confirmation.
    MUI <Select> clones its children expecting <MenuItem>. Wrapping a MenuItem in
    <Tooltip><span> can swallow the props Select injects and may emit a console
    warning, and the tooltip may not fire on the disabled item. We cannot test the
    browser from here. In results.md task 4: state whether you can confirm (from MUI
    docs / your knowledge) that the disabled MenuItem's tooltip will actually appear
    on hover with this wrapping, OR propose the standard MUI-safe pattern for a
    tooltip on a disabled Select MenuItem (e.g. keeping the MenuItem as the DIRECT
    child of Select and putting the Tooltip+span INSIDE the MenuItem around its label,
    so Select still sees a MenuItem as its direct child). If the inside-the-MenuItem
    wrapping is safer, APPLY it.

  DELIVERABLE in results.md task 4:
    1. Paste the final ScopeSettings.tsx region showing the moved early return
       (the `if (roles.length === 0) return null;` line in its new position right
       before the JSX return) so we can confirm hook order.
    2. Confirm the deptNotInSession key (EN + UK) for DB import.
    3. State your 4c decision and, if you changed the tooltip wrapping, paste the new
       MenuItem-rendering block.
  Then set this task to DONE.

---

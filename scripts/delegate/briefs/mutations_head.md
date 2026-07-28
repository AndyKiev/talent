# Objective

Migrate each listed `useXMutations` hook to the shared `useCrudMutations` helper.
Return the COMPLETE new content of every file you change.

These files predate the helper and hand-roll the same create/update/delete trio.
The helper already exists and 18 other slices already use it — this is closing an
adoption gap, not inventing a pattern.

# Context

## The helper — ALREADY EXISTS at `frontend/src/hooks/useCrudMutations.ts`

Do not modify or recreate it. Its exported surface:

```ts
export interface CrudMutationCallbacks {
    setSnackbar: (s: SnackbarType) => void;
    onCreateSuccess?: () => void;
    onUpdateSuccess?: () => void;
    onDeleteSuccess?: () => void;
    onDeleteError?: () => void;
    onMoveError?: () => void;
}

export function useCrudMutations({
    queryKey, createFn, updateFn, deleteFn, ...callbacks
}): { createMutation, updateMutation, deleteMutation }

// For sortable slices with a reorder endpoint:
export function useMoveMutation({ queryKey, moveFn, setSnackbar, onMoveError })
```

It does exactly this for each of the three: invalidate `queryKey`, then on success
`setSnackbar({ open: true, message: res.detail, severity: 'success' })` and call the
matching optional callback; on error `setSnackbar({ ..., message: err.message,
severity: 'error' })` and call `onDeleteError` for the delete.

## The canonical result — copy this shape exactly

This is `useDepartmentCategoryMutations.ts`, already migrated and green. It replaced
~60 hand-rolled lines:

```ts
// src/components/admin/department_categories/useDepartmentCategoryMutations.ts
import {createDepartmentCategory, deleteDepartmentCategory, updateDepartmentCategory,} from './departmentCategoryApi';
import { DEPARTMENT_CATEGORY_QK } from "../../../utils/queryKeys.ts";
import { useCrudMutations, type CrudMutationCallbacks } from '../../../hooks/useCrudMutations';

export function useDepartmentCategoryMutations(callbacks: CrudMutationCallbacks) {
    const crud = useCrudMutations({
        queryKey: DEPARTMENT_CATEGORY_QK,
        createFn: createDepartmentCategory,
        updateFn: updateDepartmentCategory,
        deleteFn: deleteDepartmentCategory,
        ...callbacks,
    });
    return crud;
}
```

# Constraints

The build runs `noUnusedLocals: true` and the gate runs eslint `--max-warnings=0`.
Every item below is a hard failure if you get it wrong.

1. **THE PUBLIC SHAPE MUST NOT CHANGE.** Consumers (the XCrud components) are NOT in
   your allowed paths and must not need editing. Keep the exported function name, its
   parameter shape, and everything it returns. If the current hook returns extra
   members, it still returns them, with the same names.

2. **Migrate ONLY the standard create/update/delete trio.** Any OTHER mutation in the
   file — bulk upload, setGroups, reorder/move, apply, assign, a second entity's CRUD —
   stays exactly as it is, hand-written, and stays in the returned object. Only the
   three standard ones move into `useCrudMutations`.

3. **LEAVE THE WHOLE FILE UNCHANGED if any of the three deviates from the standard
   behaviour above.** Specifically, do not migrate a mutation that:
   - invalidates more than the one slice list query, or invalidates a second key;
   - does an optimistic update, `setQueryData`, or reads/transforms the response
     beyond `res.detail`;
   - shows a different message than `res.detail` / `err.message`;
   - has extra logic in `onSuccess` / `onError` beyond snackbar + the callback.
   When you skip a file, return it unchanged or omit it, and say which and why in
   Notes. A partial or "close enough" migration is worse than none.

4. **A sortable slice's reorder mutation** may use the exported `useMoveMutation`
   if it matches that helper exactly; otherwise leave it hand-written.

5. **Import path is relative and depends on depth** — count directories to
   `frontend/src/hooks/useCrudMutations`:
   - `src/components/admin/regions/...` -> `'../../../hooks/useCrudMutations'`
   - `src/components/admin/planning_setup/plan_scope_default/...` -> `'../../../../hooks/useCrudMutations'`
   - `src/components/candidates/...` -> `'../../hooks/useCrudMutations'`
   No file extension on this import.

6. **Prune imports the migration made unused — check the whole file first.**
   Typically `useMutation`, `useQueryClient` (from `@tanstack/react-query`) and
   `SnackbarType` become unused. But if a non-migrated mutation still uses
   `useMutation`, KEEP it. Removing a still-used name and leaving an unused one both
   fail the build.

7. Preserve the file's existing indentation and line endings. Do not reformat or
   reorder anything you did not have to touch.

8. No `any`. No emoji anywhere, including comments.

# Definition of done

- Each migrated hook is the canonical shape above, plus any extra mutations kept
  verbatim, with an unchanged public surface.
- `cd frontend && node.exe ./node_modules/typescript/bin/tsc -b --force` exits 0.
- eslint on the listed files with `--max-warnings=0` exits 0.

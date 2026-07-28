# Objective

Convert each listed `XCrud.tsx` component to the shared `useCrudGrid` hook and the
shared `<CrudDialogs>` tail. Return the COMPLETE new content of every file you change.

Both helpers already exist and are shown below under "Reference". Do not modify or
recreate them. A fully converted, verified example follows them — copy its shape.

# What the conversion does

1. **Delete** the local `useState` blocks for snackbar, formOpen, editingState,
   pendingEdit, rowToDelete and paginationModel; the `useQuery` list call; the
   `useXMutations(...)` call; the `useDataGridLocale()` call; and the handlers
   `handleEditFieldClick`, `handleRequestSave`, `handleConfirmEdit`,
   `handleCancelEdit`, `handleCancelPending`, `handleDeleteClick`,
   `handleConfirmDelete` plus every per-field `handleToggleX`.
2. **Add** one `useCrudGrid({...})` call, named `crud`.
3. **Rewire** the JSX and the `useXColumns(...)` call to read from `crud`.
4. **Replace** the `FieldEditConfirmDialog` + `ConfirmDeleteDialog` + `Snackbar` tail
   with one `<CrudDialogs>`.

# Constraints

`noUnusedLocals: true` and eslint `--max-warnings=0` gate this. Each is a hard fail.

1. **Toggle handlers become inline calls** to `crud.requestToggle`:
   `onToggleActive: (row) => crud.requestToggle(row, 'is_active', 'isActive', 'Active')`
   — field name, translation key and the English fallback all copied verbatim from
   the handler you deleted.

2. **`fieldLabels`** is a module-level const mapping each inline-editable field to the
   translation key the deleted `fieldLabelMap` used. Same keys, same fields.

3. **A sorted slice** passes `compare`, declared at module level (never an inline
   arrow — it would re-sort every render). Copy the existing sort comparator exactly.

4. **`useArrowReorder` stays in the component**, reading `crud.rows` and
   `crud.setSnackbar`. Do not move it into the hook.

5. **The list query's `staleTime` and the grid's page size** carry over: pass
   `staleTime` / `pageSize` to `useCrudGrid` if the file used values other than
   `2 * 60 * 1000` and `10`.

6. **LEAVE THE WHOLE FILE UNCHANGED** and say so in Notes if any of these hold:
   - it renders more than one DataGrid, or is a tree/kanban rather than a grid;
   - its list `useQuery` takes filter params, is `enabled`-gated, or is not a plain
     zero-arg fetch of the slice list;
   - its `useXMutations` call passes callbacks beyond the standard five, or the file
     uses mutations the hook does not provide (bulk upload, reorder endpoints,
     assignment dialogs) — UNLESS those come from a separate hook call you can leave
     untouched;
   - it has extra local state driving dialogs the tail does not cover;
   - it has no `rowToDelete` delete flow at all.
   A partial conversion is worse than none.

7. **`<CrudDialogs>`**: pass `deleteTitle` and `deleteMessage` exactly as the old
   `ConfirmDeleteDialog` built them, including `getString(...)` and the English
   template-literal fallback. Pass `withFieldEdit={false}` if the file had no
   `FieldEditConfirmDialog`.

8. **Prune imports made unused** — typically `useState`, `useCallback`, `useMemo`,
   `React`, `useQuery`, `Alert`, `Snackbar`, `useDataGridLocale`,
   `FieldEditConfirmDialog`, `ConfirmDeleteDialog`, the `useXMutations` import and the
   `EditingState` / `PendingEdit` types. Keep anything still used. Check the whole file.

9. Import paths are relative — count directories to `frontend/src/hooks/useCrudGrid`
   and `frontend/src/components/ui/CrudDialogs`. No file extension.

10. Never change a label, message or translation key. No non-English literals. No
    `any`. No emoji. Preserve the file's indentation and line endings.

# Definition of done

- Each converted file has one `useCrudGrid` call and one `<CrudDialogs>`, with
  identical rendered behaviour.
- `cd frontend && node.exe ./node_modules/typescript/bin/tsc -b --force` exits 0.
- eslint on the listed files with `--max-warnings=0` exits 0.

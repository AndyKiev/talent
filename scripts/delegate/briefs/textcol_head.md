# Objective

Migrate each listed `useXColumns` hook to the shared `makeTextEditCol` and
`makeToggleCol` builders. Return the COMPLETE new content of every file you change.

These files predate the builders and hand-roll the same inline-edit cell and toggle
cell. Eight other slices already use them — this closes an adoption gap.

# Context

## The builders — ALREADY EXIST in `frontend/src/utils/columnBuilders.tsx`

Do not modify or recreate them. `deleteActionCol` from the same file is already in use.

```tsx
export interface EditingState { userId: number | null; field: string | null; }

// Bind once per grid, then call textEditCol(field, headerKey, width, flex?)
export function makeTextEditCol<T extends { id: number }>(ctx: {
    getString: GetStringFn;
    editingState: EditingState;
    onEditFieldClick: (row: T, field: string, e: React.MouseEvent) => void;
    onRequestSave: (row: T, field: string, newValue: string) => void;
    onCancelEdit: () => void;
    updateIsPending: boolean;
}): (field: keyof T & string, headerKey: string, width: number, flex?: number) => GridColDef;

// Bind once per grid, then call toggleCol(field, headerKey, onToggle)
export function makeToggleCol<T extends { id: number }>(ctx: {
    getString: GetStringFn; toggleIsPending: boolean;
}): (field: keyof T & string, headerKey: string, onToggle: (row: T) => void) => GridColDef;
```

`textEditCol` renders `<TextEditCell>` when `editingState.userId === row.id &&
editingState.field === field`, else `<ReadonlyCell>` with placeholder `—`, header
`cfl(getString(headerKey)) || headerKey`, and `width` (or `flex` when given).
`toggleCol` renders a small `<Switch>` in a centred Box, width 120, `sortable: false`.

## Canonical result — `useDepartmentTypeColumns.tsx`, already migrated and green

```tsx
import { makeTextEditCol, deleteActionCol, type EditingState } from '../../../utils/columnBuilders';
export type { EditingState };

export function useDepartmentTypeColumns({ getString, editingState, onEditFieldClick,
    onRequestSave, onCancelEdit, updateIsPending, onToggleActive, toggleIsPending,
    onDeleteClick, deleteIsPending }: Params): GridColDef[] {

    const textEditCol = makeTextEditCol<DepartmentType>({
        getString, editingState, onEditFieldClick, onRequestSave, onCancelEdit, updateIsPending,
    });
    const toggleCol = makeToggleCol<DepartmentType>({ getString, toggleIsPending });

    return [
        { field: 'id', headerName: getString('idColumn'), width: 70 },
        textEditCol('name', 'name', 200, 1),
        toggleCol('is_active', 'isActive', onToggleActive),
        deleteActionCol<DepartmentType>({ getString, onDeleteClick, deleteIsPending }),
    ];
}
```

# Constraints

`noUnusedLocals: true` and eslint `--max-warnings=0` gate this. Each is a hard fail.

1. **THE PUBLIC SHAPE MUST NOT CHANGE.** The exported hook name, its `Params`
   interface, any `export type { EditingState }` re-export, and the ORDER of the
   returned columns all stay exactly as they are. Consumers are not in your allowed
   paths and must not need edits.

2. **Migrate a column ONLY if it matches the builder exactly.** A text column
   qualifies when its `renderCell` is the TextEditCell/ReadonlyCell switch on the same
   field, with the same `—` placeholder and the same `edit<Field>` tooltip key. A
   toggle column qualifies when it is just a `<Switch>` bound to a boolean field.

3. **LEAVE A COLUMN AS-IS** (hand-written, in place, same position) if it differs at
   all: a custom `valueGetter`/`valueFormatter`, a Select or Autocomplete cell, chips,
   dates, a computed/derived value, a different placeholder, extra buttons, or a
   `renderHeader`. Migrating only some columns of a file is expected and fine.

4. **If the file's `EditingState` uses `rowId` instead of `userId`**, that is a
   different shape from the shared one. Keep the file's own interface and DO NOT
   migrate its text columns — the shared builder reads `userId`. Say so in Notes.

5. **Prune imports the migration made unused** — typically `TextEditCell`,
   `ReadonlyCell`, `Switch`, `Box`, `GridRenderCellParams`, `React`, `cfl`. Keep any
   still used by a column you left hand-written. Check the whole file.

6. Import path is relative — count directories to `frontend/src/utils/columnBuilders`.
   No file extension. Never change a label, header key or translation key. No
   non-English literals. No `any`. No emoji. Preserve indentation and line endings.

# Definition of done

- Every qualifying column uses the builders; the rest are untouched and in order.
- `cd frontend && node.exe ./node_modules/typescript/bin/tsc -b --force` exits 0.
- eslint on the listed files with `--max-warnings=0` exits 0.

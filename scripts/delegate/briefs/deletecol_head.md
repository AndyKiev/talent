# Objective

In each file listed under "Files to change", replace the trailing `_actions`
DataGrid column (the delete-button column) with a call to the shared
`deleteActionCol` builder. Return the COMPLETE new content of every file you change.

# Context

## The shared builder — ALREADY EXISTS in `frontend/src/utils/columnBuilders.tsx`

Do not recreate, move or modify it. It sits alongside the existing
`makeTextEditCol` / `makeToggleCol` builders in the same file.

```tsx
export interface DeleteColContext<T extends { id: number }> {
    getString: GetStringFn;
    onDeleteClick: (row: T) => void;
    deleteIsPending: boolean;
}

export function deleteActionCol<T extends { id: number }>(ctx: DeleteColContext<T>): GridColDef {
    const { getString, onDeleteClick, deleteIsPending } = ctx;
    return {
        field: '_actions',
        headerName: '',
        width: 56,
        sortable: false,
        filterable: false,
        disableColumnMenu: true,
        renderCell: (params: GridRenderCellParams<T>) => (
            <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
                <Tooltip title={getString('delete') || 'Delete'}>
                    <span>
                        <IconButton
                            size="small"
                            color="error"
                            onClick={(e) => { e.stopPropagation(); onDeleteClick(params.row); }}
                            disabled={deleteIsPending}
                        >
                            <DeleteIcon fontSize="small" />
                        </IconButton>
                    </span>
                </Tooltip>
            </Box>
        ),
    };
}
```

## The canonical conversion — copy this shape exactly

This is `useDepartmentTypeColumns.tsx`, already converted and verified green
(`tsc -b` and `eslint --max-warnings=0` both exit 0).

BEFORE:

```tsx
import { Box, IconButton, Switch, Tooltip } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { makeTextEditCol, type EditingState } from '../../../utils/columnBuilders';

        {
            field: '_actions',
            headerName: '',
            width: 56,
            sortable: false,
            filterable: false,
            disableColumnMenu: true,
            renderCell: (params: GridRenderCellParams<DepartmentType>) => (
                <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
                    <Tooltip title={getString('delete') || 'Delete'}>
                        <span>
                            <IconButton
                                size="small"
                                color="error"
                                onClick={(e) => { e.stopPropagation(); onDeleteClick(params.row); }}
                                disabled={deleteIsPending}
                            >
                                <DeleteIcon fontSize="small" />
                            </IconButton>
                        </span>
                    </Tooltip>
                </Box>
            ),
        },
    ];
```

AFTER — note `IconButton`, `Tooltip` and the whole `DeleteIcon` import line are
gone, because nothing else in that file used them, while `Box` and `Switch` stayed
because the toggle column still uses them:

```tsx
import { Box, Switch } from '@mui/material';
import { makeTextEditCol, deleteActionCol, type EditingState } from '../../../utils/columnBuilders';

        deleteActionCol<DepartmentType>({ getString, onDeleteClick, deleteIsPending }),
    ];
```

# Constraints

The build runs `noUnusedLocals: true` and the gate runs eslint with
`--max-warnings=0`, so every one of these is a hard failure if you get it wrong.

1. **Replace the WHOLE column object**, from its opening `{` through its closing
   `},` — not just the `renderCell` body. The result is a single line ending in a
   comma, in the same position in the array.

2. **Pass the row type as the generic**: `deleteActionCol<Region>({ ... })`. Use the
   exact row type already used elsewhere in that file's `GridRenderCellParams<...>`.

3. **CONVERT ONLY AN EXACT MATCH.** Replace the column only if it has exactly these
   six properties — `field: '_actions'`, `headerName: ''`, `width: 56`,
   `sortable: false`, `filterable: false`, `disableColumnMenu: true` — and its
   `renderCell` contains ONLY the delete `Tooltip`/`IconButton` shown above.
   If the column has a different width, an extra button (edit, copy, view, a second
   `IconButton`), a `Stack`, or any additional markup, **leave that file completely
   unchanged** and say so in Notes. Do not try to generalise the builder.

4. **Import**: if the file already imports from `utils/columnBuilders`, add
   `deleteActionCol` to that existing import. Otherwise add a new import line. The
   relative path depends on the file's depth — count directories to
   `frontend/src/utils/columnBuilders`:
   - `components/admin/regions/useRegionColumns.tsx` -> `'../../../utils/columnBuilders'`
   - `components/admin/employee_events/employee_event_types/...` -> `'../../../../utils/columnBuilders'`
   - `components/developer/catalog/operations/...` -> `'../../../../utils/columnBuilders'`
   No file extension.

5. **Prune imports that the removal made unused — check the WHOLE file first.**
   Typically `Tooltip`, `IconButton` and the `DeleteIcon` default import become
   unused; `Box` usually does NOT because other cells use it. **`GridRenderCellParams`
   is the one people forget** — if the deleted `renderCell` was its last use, remove
   it from the `@mui/x-data-grid` type import too (keep `GridColDef`). Removing a
   still-used name, or leaving an unused one, both fail the build.

6. **Preserve the file's existing indentation** (2-space vs 4-space) and its line
   endings. Change nothing except the column object and the import lines.

7. No `any`. No emoji anywhere, including comments. Do not reformat, reorder or
   "tidy" any other column.

# Definition of done

- Every exactly-matching `_actions` column in the listed files is one
  `deleteActionCol<Row>({ getString, onDeleteClick, deleteIsPending }),` line.
- `cd frontend && node.exe ./node_modules/typescript/bin/tsc -b --force` exits 0.
- eslint on the listed files with `--max-warnings=0` exits 0.

```json
{
  "max_iterations": 4,
  "allow_paths": ["frontend/src/components/"],
  "validate": [
    "cd frontend && npx tsc -b",
    "cd frontend && npx eslint src --max-warnings=0"
  ]
}
```

# Objective

Every per-essence `*DeleteDialog.tsx` hand-rolls the same MUI `Dialog` /
`DialogTitle` / `DialogContent` / `DialogActions` block. A shared
`ConfirmDeleteDialog` already exists. Rewrite each listed file so it renders
`ConfirmDeleteDialog` instead of its own MUI block.

**The exported component's name, its `Props` interface and every prop name must
stay byte-identical.** Call sites are NOT in scope and must keep compiling
untouched. You are replacing the *body*, nothing else.

# Context — the shared component

`frontend/src/components/ui/ConfirmDeleteDialog.tsx` (default export):

```tsx
interface Props {
    open: boolean;
    /** Already-resolved dialog title; defaults to the generic "Confirm delete". */
    title?: ReactNode;
    /** Already-resolved confirmation message. */
    message: ReactNode;
    /** Optional identifier of the record being removed, shown beneath the message. */
    itemLabel?: string;
    /** Extra content (cascade warnings etc.) rendered ABOVE the message. */
    children?: ReactNode;
    isDeleting?: boolean;
    confirmDisabled?: boolean;
    /** Already-resolved confirm label; defaults to "Delete". */
    confirmLabel?: string;
    onConfirm: () => void;
    onClose: () => void;
}
```

It already renders: Cancel button (`variant="outlined"`, disabled while
deleting), destructive confirm button (`variant="contained" color="error"`,
`<DeleteIcon/>` or a spinner), `maxWidth="xs" fullWidth`.

## Canonical before → after (this exact conversion is already done, copy its shape)

BEFORE — `src/components/developer/security/menus/MenuDeleteDialog.tsx`:

```tsx
import { Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Button, CircularProgress } from '@mui/material';
import type { MenuAdmin } from './menuAdminApi';
import useString from '../../../../hooks/useString';
import cfl from '../../../../utils/helpers';

interface Props { row: MenuAdmin | null; isPending: boolean; onConfirm: () => void; onCancel: () => void; }

export function MenuDeleteDialog({ row, isPending, onConfirm, onCancel }: Props) {
    const getString = useString();
    return (
        <Dialog open={!!row} onClose={onCancel} maxWidth="xs" fullWidth>
            <DialogTitle>{cfl(getString('deleteMenu')) || 'Delete Menu'}</DialogTitle>
            <DialogContent>
                <DialogContentText>
                    {getString('menuDeleteConfirm', { key: row?.key ?? '' }) || `Delete menu "${row?.key ?? ''}"? This cannot be undone.`}
                </DialogContentText>
            </DialogContent>
            <DialogActions>
                <Button variant="outlined" onClick={onCancel} disabled={isPending}>{getString('cancel') || 'Cancel'}</Button>
                <Button variant="contained" color="error" onClick={onConfirm} disabled={isPending}
                    startIcon={isPending ? <CircularProgress size={16} color="inherit" /> : undefined}>
                    {getString('delete') || 'Delete'}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
```

AFTER:

```tsx
// src/components/developer/security/menus/MenuDeleteDialog.tsx
import type { MenuAdmin } from './menuAdminApi';
import useString from '../../../../hooks/useString';
import cfl from '../../../../utils/helpers';
import ConfirmDeleteDialog from '../../../ui/ConfirmDeleteDialog';

interface Props { row: MenuAdmin | null; isPending: boolean; onConfirm: () => void; onCancel: () => void; }

export function MenuDeleteDialog({ row, isPending, onConfirm, onCancel }: Props) {
    const getString = useString();
    return (
        <ConfirmDeleteDialog
            open={!!row}
            title={cfl(getString('deleteMenu')) || 'Delete Menu'}
            message={
                getString('menuDeleteConfirm', { key: row?.key ?? '' }) ||
                `Delete menu "${row?.key ?? ''}"? This cannot be undone.`
            }
            isDeleting={isPending}
            onConfirm={onConfirm}
            onClose={onCancel}
        />
    );
}
```

Second reference — a dialog whose body had a bolded record label underneath the
message becomes `itemLabel`:

```tsx
        <ConfirmDeleteDialog
            open={open}
            title={getString('deleteMission')}
            message={getString('deleteMissionConfirm')}
            itemLabel={mission?.text}
            isDeleting={isDeleting}
            onConfirm={onConfirm}
            onClose={onClose}
        />
```

# Constraints

- **Preserve every translation key and every English fallback string exactly.**
  Do not rename keys, do not invent keys, do not drop a `cfl(...)` wrapper, do
  not drop a `|| 'English text'` fallback. Copy the expressions across verbatim.
- **Map the old JSX onto props like this:**
  - `<DialogTitle>X</DialogTitle>` → `title={X}`
  - the single main `<DialogContentText>` / `<Typography>` → `message={...}`
  - a SECOND text node showing the record's own name/identifier below the
    message → `itemLabel={...}` (string only)
  - a confirm button whose label is NOT the `delete` key (e.g. `remove`) →
    `confirmLabel={getString('remove') || 'Remove'}`
  - `open={!!row}` stays `open={!!row}`; a `open` prop stays `open={open}`
  - `isPending` / `isDeleting` / `pending` → `isDeleting={...}`
  - `onCancel` / `onClose` → `onClose={...}`
- **Drop purely cosmetic differences** — they are noise, not behaviour:
  `sx={{ textTransform: 'none' }}` on buttons, spinner `startIcon`,
  `variant="outlined"` on Cancel, `DialogContent sx={{ display:'flex', ... }}`,
  `variant="body2"` on the message. The shared component already styles these.
- **`import str from '.../strings/str'` and `useString({ str })` must be
  DELETED** — that is the login-page-only legacy form. Use plain `useString()`.
- Keep the leading `// src/...` path comment if the file has one, and keep any
  explanatory JSDoc above the component.
- No `any`. No emoji. 4-space indentation unless the file already uses 2 (then
  keep 2).

## Refuse a file (return it unchanged, and say why) when

- it renders anything the props above cannot express — a `<Chip>`, a list of
  affected child records, a checkbox, a text input, a second action button, a
  cascade warning that is a whole JSX block rather than one string;
- its confirm button does something other than call `onConfirm`;
- it is not actually a delete-confirmation dialog.

Refusing is a correct outcome. Do NOT invent extra props on
`ConfirmDeleteDialog` — its Props interface is fixed and out of scope.

# Definition of done

`npx tsc -b` and `npx eslint src --max-warnings=0` both exit 0, every converted
file renders `ConfirmDeleteDialog`, and no call site anywhere in the app needed
editing.

# Files to convert


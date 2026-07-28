# Objective

In each file listed under "Files to change", replace the dialog footer — the
`<DialogActions>` block with its Cancel and submit buttons — with the shared
`<CrudFormActions>` component. Return the COMPLETE new content of every file you
change.

# Context

## The shared component — ALREADY EXISTS at `frontend/src/components/ui/CrudFormActions.tsx`

Do not recreate or modify it.

```tsx
interface CrudFormActionsProps {
    getString: GetStringFn;
    onCancel: () => void;
    onSubmit: () => void;
    isPending: boolean;
    /** Translation key for the submit button: 'create' for add forms, 'save' for edit. */
    submitKey?: string;          // default 'create'
    submitFallback?: string;     // default 'Create'
    submitDisabled?: boolean;
}

export function CrudFormActions({ getString, onCancel, onSubmit, isPending,
    submitKey = 'create', submitFallback = 'Create', submitDisabled }: CrudFormActionsProps) {
    return (
        <DialogActions>
            <Button variant="outlined" onClick={onCancel} disabled={isPending}>
                {getString('cancel') || 'Cancel'}
            </Button>
            <Button
                variant="contained"
                onClick={onSubmit}
                disabled={isPending || submitDisabled}
                startIcon={isPending ? <CircularProgress size={16} color="inherit" /> : undefined}
            >
                {getString(submitKey) || submitFallback}
            </Button>
        </DialogActions>
    );
}
```

## The canonical conversion — copy this shape exactly

BEFORE (`DepartmentCategoryForm.tsx`):

```tsx
            <DialogActions>
                <Button variant="outlined" onClick={handleClose} disabled={createMutation.isPending}>
                    {getString('cancel') || 'Cancel'}
                </Button>
                <Button
                    variant="contained"
                    onClick={handleSubmit(onSubmit)}
                    disabled={createMutation.isPending}
                    startIcon={createMutation.isPending ? <CircularProgress size={16} color="inherit" /> : undefined}
                >
                    {getString('create') || 'Create'}
                </Button>
            </DialogActions>
```

AFTER — `DialogActions`, `CircularProgress` and often `Button` drop out of the
`@mui/material` import, because nothing else in that file used them:

```tsx
            <CrudFormActions
                getString={getString}
                onCancel={handleClose}
                onSubmit={handleSubmit(onSubmit)}
                isPending={createMutation.isPending}
            />
```

An EDIT form whose submit button says "save" passes the key explicitly:

```tsx
            <CrudFormActions
                getString={getString}
                onCancel={handleClose}
                onSubmit={handleSubmit(onSubmit)}
                isPending={updateMutation.isPending}
                submitKey="save"
                submitFallback="Save"
            />
```

# Constraints

The build runs `noUnusedLocals: true` and the gate runs eslint `--max-warnings=0`.
Each item below is a hard failure if you get it wrong.

1. **Replace the whole `<DialogActions>` element**, opening tag through closing tag.

2. **Carry the existing values across verbatim.** `onCancel` gets whatever the Cancel
   button's `onClick` was. `onSubmit` gets whatever the submit button's `onClick` was,
   including the `handleSubmit(...)` wrapper. `isPending` gets the exact expression the
   buttons used for `disabled` / `startIcon`.

3. **Preserve the submit label.** If the submit button used `getString('create')`,
   omit `submitKey` (that is the default). For any other key, pass `submitKey` and
   `submitFallback` with the file's existing English fallback string, verbatim. Never
   change, translate or reword a label; never introduce non-English literal text.

4. **CONVERT ONLY AN EXACT MATCH — two buttons, Cancel then submit.** Leave the file
   completely unchanged, and say so in Notes, if the footer:
   - has a third button (Delete, Back, Reset, Skip);
   - has a submit `disabled` expression that is NOT just the same `isPending` value
     — unless the extra condition can be passed unchanged as `submitDisabled`, in
     which case do that;
   - wraps the buttons in a `Box`/`Stack`, or sets `sx` on `DialogActions`;
   - uses a `type="submit"` inside a `<form>` rather than an `onClick`.

5. **Prune imports the removal made unused — check the WHOLE file first.**
   `DialogActions` and `CircularProgress` almost always become unused; `Button` often
   does NOT, because forms have other buttons. Removing a still-used name and leaving
   an unused one both fail the build.

6. **Import path is relative and depends on depth** — count directories to
   `frontend/src/components/ui/CrudFormActions`:
   - `src/components/admin/regions/RegionForm.tsx` -> `'../../ui/CrudFormActions'`
   - `src/components/admin/planning_setup/plan_session_status/...` -> `'../../../ui/CrudFormActions'`
   - `src/components/developer/process_roles/process/...` -> `'../../../ui/CrudFormActions'`
   No file extension.

7. Preserve the file's existing indentation (2-space vs 4-space) and line endings.
   Change nothing outside the footer and the import lines.

8. No `any`. No emoji anywhere, including comments.

# Definition of done

- Every exactly-matching dialog footer in the listed files is one `<CrudFormActions>`
  element with the original behaviour and labels preserved.
- `cd frontend && node.exe ./node_modules/typescript/bin/tsc -b --force` exits 0.
- eslint on the listed files with `--max-warnings=0` exits 0.

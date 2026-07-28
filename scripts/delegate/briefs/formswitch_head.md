# Objective

In each file listed under "Files to change", replace every MUI `<Switch>` that is
bound to react-hook-form via `watch(...)` / `setValue(...)` with the shared
`<FormSwitch>` component. Return the COMPLETE new content of every file you change.

Why: `watch()` returns a function the React Compiler cannot memoize, so eslint
`react-hooks/incompatible-library` skips compiling the whole component. `FormSwitch`
uses `Controller` internally and has no such problem.

# Context

## The shared component — ALREADY EXISTS, do not recreate or modify it

`frontend/src/components/ui/FormSwitch.tsx`:

```tsx
interface FormSwitchProps<T extends FieldValues> {
    name: FieldPath<T>;
    control: Control<T>;
    label: ReactNode;
    disabled?: boolean;
}

export function FormSwitch<T extends FieldValues>({ name, control, label, disabled }: FormSwitchProps<T>) {
    return (
        <Controller
            name={name}
            control={control}
            render={({ field }) => (
                <FormControlLabel
                    control={
                        <Switch
                            checked={!!field.value}
                            onChange={(_, checked) => field.onChange(checked)}
                            disabled={disabled}
                        />
                    }
                    label={label}
                />
            )}
        />
    );
}
```

## The canonical conversion — copy this shape exactly

BEFORE (in `DepartmentCategoryForm.tsx`):

```tsx
import { useForm } from 'react-hook-form';
import {
    Dialog, DialogTitle, DialogContent, DialogActions, TextField, Button, Box,
    Alert, CircularProgress, FormControlLabel, Switch,
} from '@mui/material';

    const {
        register, handleSubmit, formState: { errors }, reset, watch, setValue,
    } = useForm<FormData>({ ... });

                    <FormControlLabel
                        control={
                            <Switch
                                checked={watch('is_active')}
                                onChange={(_, checked) => setValue('is_active', checked)}
                            />
                        }
                        label={cfl(getString('isActive')) || 'Active'}
                    />
```

AFTER (verified green — `tsc -b` and `eslint --max-warnings=0` both exit 0):

```tsx
import { useForm } from 'react-hook-form';
import {
    Dialog, DialogTitle, DialogContent, DialogActions, TextField, Button, Box,
    Alert, CircularProgress,
} from '@mui/material';
import { FormSwitch } from '../../ui/FormSwitch';

    const {
        register, handleSubmit, formState: { errors }, reset, control,
    } = useForm<FormData>({ ... });

                    <FormSwitch
                        name="is_active"
                        control={control}
                        label={cfl(getString('isActive')) || 'Active'}
                    />
```

# Constraints

These are not suggestions. The build has `noUnusedLocals: true` and eslint runs with
`--max-warnings=0`, so each of these produces a hard failure if you get it wrong.

1. **Import path is RELATIVE and differs per file.** Count directory levels from the
   file to `frontend/src/components/ui/FormSwitch`. Examples:
   - `frontend/src/components/admin/regions/RegionForm.tsx` -> `'../../ui/FormSwitch'`
   - `frontend/src/components/developer/process_roles/process/ProcessForm.tsx` -> `'../../../ui/FormSwitch'`
   - `frontend/src/components/employees/EmployeeEditDialog.tsx` -> `'../ui/FormSwitch'`
   Do not use an extension. Do not use an absolute or aliased path.

2. **`useForm` destructure**: add `control` if it is not already there.
   **`watch` must go entirely** — the eslint rule fires on ANY `watch()` call, not
   just the ones feeding a Switch, and the gate runs `--max-warnings=0`. Convert every
   remaining `const x = watch('field')` in the file to
   `const x = useWatch({ control, name: 'field' })` and drop `watch` from the
   destructure. (Learned the hard way: a brief that said "keep `watch` if used
   elsewhere" cost an extra iteration.)
   `setValue` is NOT flagged — remove it ONLY IF nothing else in the file uses it.

3. **`@mui/material` import**: remove `FormControlLabel` and/or `Switch` ONLY IF they
   are not used anywhere else in the same file. Some files render a `<Switch>` bound
   to plain `useState`, or use `<FormControlLabel>` around a `<Checkbox>` — those stay
   and so do their imports.

4. **Only convert switches bound to the FORM.** A `<Switch>` whose `checked` comes
   from `useState` or from a prop is NOT a form field — leave it exactly as it is.

5. **The `label` expression is copied VERBATIM**, including the `cfl(...)`,
   `getString(...)` and any `|| 'English fallback'`. Never change, translate or
   re-word a label. Never introduce non-English literal text.

6. **Preserve the file's existing indentation style** (2-space vs 4-space) and its
   existing line endings. Change nothing outside the switch blocks, the `useForm`
   destructure and the two import statements.

7. No `any`. No emoji anywhere, including comments.

8. If a listed file turns out to have no form-bound `<Switch>`, return it unchanged
   or omit it — do not invent a conversion.

# Definition of done

- Every form-bound `<Switch>` in the listed files renders through `<FormSwitch>`.
- `cd frontend && node.exe ./node_modules/typescript/bin/tsc -b --force` exits 0.
- eslint on the listed files with `--max-warnings=0` exits 0, i.e. no
  `react-hooks/incompatible-library` warning remains in them.

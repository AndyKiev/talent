# Objective

In each file listed under "Files to change", replace every react-hook-form-bound
`<TextField>` with the shared `<FormTextField>` component. Return the COMPLETE new
content of every file you change.

# Context

## The shared component — ALREADY EXISTS at `frontend/src/components/ui/FormTextField.tsx`

Do not recreate or modify it. It is a `forwardRef` wrapper, so spreading
`{...register('x')}` onto it behaves exactly as it did on `TextField`.

```tsx
interface FormTextFieldProps extends Omit<TextFieldProps, 'error' | 'helperText'> {
    getString: GetStringFn;
    fieldError?: FieldError;   // e.g. errors.name
    maxLength?: number;        // becomes slotProps.htmlInput.maxLength
    hint?: ReactNode;          // shown when there is no error
}
```

It always sets `fullWidth`, sets `error={!!fieldError}`, and renders
`helperText = (message && (getString(message) || message)) || hint`.

## The canonical conversion — copy this shape exactly

BEFORE (`DepartmentCategoryForm.tsx`, verified green):

```tsx
                    <TextField
                        label={cfl(getString('name')) || 'Name'}
                        fullWidth
                        slotProps={{ htmlInput: { maxLength: 64 } }}
                        error={!!errors.name}
                        helperText={errors.name?.message && (getString(errors.name.message) || errors.name.message)}
                        {...register('name')}
                    />
                    <TextField
                        label={cfl(getString('description')) || 'Description'}
                        fullWidth
                        multiline
                        minRows={2}
                        slotProps={{ htmlInput: { maxLength: 256 } }}
                        error={!!errors.description}
                        helperText={
                            errors.description?.message &&
                            (getString(errors.description.message) || errors.description.message)
                        }
                        {...register('description')}
                    />
```

AFTER:

```tsx
                    <FormTextField
                        label={cfl(getString('name')) || 'Name'}
                        getString={getString}
                        maxLength={64}
                        fieldError={errors.name}
                        {...register('name')}
                    />
                    <FormTextField
                        label={cfl(getString('description')) || 'Description'}
                        getString={getString}
                        multiline
                        minRows={2}
                        maxLength={256}
                        fieldError={errors.description}
                        {...register('description')}
                    />
```

Note what happened: `fullWidth` dropped (the component always sets it), the
`slotProps` maxLength became `maxLength`, `error` and `helperText` became
`fieldError`, and every other prop (`label`, `multiline`, `minRows`, the
`{...register(...)}` spread) carried over UNCHANGED and in the same order.

# Constraints

The build runs `noUnusedLocals: true` and the gate runs eslint `--max-warnings=0`.

1. **Convert ONLY a TextField whose `helperText` is exactly the "resolve the zod
   message key through getString" pattern** shown above, and whose `error` is
   `!!errors.<field>`. The message key and the field must be the SAME field.

2. **A helperText with a non-error fallback** — e.g.
   `helperText={errText(errors.icon?.message) || (getString('hint') || 'Some hint')}` —
   converts with the fallback passed as `hint={...}`, verbatim. If the file has a
   local helper like `errText(...)`, pass `fieldError={errors.x}` and keep the
   fallback expression in `hint`; delete the local helper ONLY if nothing else uses it.

3. **LEAVE A TextField UNCHANGED if** it is not bound to react-hook-form (no
   `{...register(...)}` and no `field` from a `Controller`), or it is a `select`
   TextField (`select` prop with `<MenuItem>` children), or it sets its own
   `slotProps` beyond `htmlInput.maxLength`, or its `helperText` does anything else.
   Converting a Controller-driven TextField is out of scope — leave those.

4. **`fullWidth` must be dropped** when converting (the component sets it). Do not
   pass `fullWidth` to `FormTextField`.

5. **Labels are copied VERBATIM**, including `cfl(...)`, `getString(...)` and any
   `|| 'English fallback'`. Never change, translate or reword a label. Never
   introduce non-English literal text.

6. **Prune imports the change made unused — check the WHOLE file first.** `TextField`
   often becomes unused, but NOT if a select/Controller TextField remains. Removing a
   still-used name and leaving an unused one both fail the build.

7. **Import path is relative** — count directories to
   `frontend/src/components/ui/FormTextField`:
   - `src/components/admin/regions/RegionForm.tsx` -> `'../../ui/FormTextField'`
   - `src/components/developer/security/menus/MenuForm.tsx` -> `'../../../ui/FormTextField'`
   No file extension.

8. Preserve the file's existing indentation and line endings. Change nothing else.
   No `any`. No emoji.

# Definition of done

- Every eligible bound TextField renders through `<FormTextField>`, same labels,
  same validation messages, same maxLength.
- `cd frontend && node.exe ./node_modules/typescript/bin/tsc -b --force` exits 0.
- eslint on the listed files with `--max-warnings=0` exits 0.

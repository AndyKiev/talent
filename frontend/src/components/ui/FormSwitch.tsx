// src/components/ui/FormSwitch.tsx
import type { ReactNode } from 'react';
import { Controller, type Control, type FieldPath, type FieldValues } from 'react-hook-form';
import { FormControlLabel, Switch } from '@mui/material';

interface FormSwitchProps<T extends FieldValues> {
    name: FieldPath<T>;
    control: Control<T>;
    label: ReactNode;
    disabled?: boolean;
}

/**
 * Boolean switch bound to a react-hook-form field.
 *
 * Always use this instead of `checked={watch('flag')}` + `setValue('flag', v)`:
 * `watch()` returns a function the React Compiler cannot memoize, so every form
 * that called it was silently dropped from compilation
 * (eslint react-hooks/incompatible-library). Controller has no such problem.
 */
export function FormSwitch<T extends FieldValues>({
    name,
    control,
    label,
    disabled,
}: FormSwitchProps<T>) {
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

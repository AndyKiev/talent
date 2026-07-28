// src/components/ui/FormTextField.tsx
import { forwardRef, type ReactNode } from 'react';
import { TextField, type TextFieldProps } from '@mui/material';
import type { FieldError } from 'react-hook-form';
import type { GetStringFn } from '../../types/getStringFn';

interface FormTextFieldProps extends Omit<TextFieldProps, 'error' | 'helperText'> {
    getString: GetStringFn;
    /** The react-hook-form error for this field, e.g. errors.name. */
    fieldError?: FieldError;
    /** Becomes slotProps.htmlInput.maxLength. */
    maxLength?: number;
    /** Shown when there is no error (hint text). */
    hint?: ReactNode;
}

/**
 * TextField bound to a react-hook-form field. Every essence form repeated the
 * same fullWidth + maxLength + error + "resolve the zod message key through
 * getString" helperText block; only the label and the field differed.
 *
 * Zod messages are translation KEYS, so the message is resolved at render and
 * falls back to the raw key — never to hardcoded human text.
 */
export const FormTextField = forwardRef<HTMLDivElement, FormTextFieldProps>(function FormTextField(
    { getString, fieldError, maxLength, hint, slotProps, ...rest },
    ref,
) {
    const message = fieldError?.message;
    return (
        <TextField
            {...rest}
            ref={ref}
            fullWidth
            slotProps={maxLength ? { htmlInput: { maxLength }, ...slotProps } : slotProps}
            error={!!fieldError}
            helperText={(message && (getString(message) || message)) || hint}
        />
    );
});

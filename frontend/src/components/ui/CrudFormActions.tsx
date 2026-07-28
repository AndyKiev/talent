// src/components/ui/CrudFormActions.tsx
import { Button, CircularProgress, DialogActions } from '@mui/material';
import type { GetStringFn } from '../../types/getStringFn';

interface CrudFormActionsProps {
    getString: GetStringFn;
    onCancel: () => void;
    onSubmit: () => void;
    isPending: boolean;
    /** Translation key for the submit button: 'create' for add forms, 'save' for edit. */
    submitKey?: string;
    submitFallback?: string;
    /** Extra reason to block submit, on top of isPending (e.g. nothing selected). */
    submitDisabled?: boolean;
}

/**
 * The Cancel / submit footer every essence dialog ends with. The buttons kept
 * being copied verbatim across ~21 forms; only the submit label and the pending
 * flag ever differed.
 */
export function CrudFormActions({
    getString,
    onCancel,
    onSubmit,
    isPending,
    submitKey = 'create',
    submitFallback = 'Create',
    submitDisabled,
}: CrudFormActionsProps) {
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

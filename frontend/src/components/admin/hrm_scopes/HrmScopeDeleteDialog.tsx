// src/components/admin/hrm_scopes/HrmScopeDeleteDialog.tsx
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogContentText,
    DialogActions,
    Button,
    CircularProgress,
} from '@mui/material';
import type { HrmScope } from './hrmScopeApi';
import type { GetStringFn } from '../../../types/getStringFn';

interface Props {
    open: boolean;
    scope: HrmScope | null;
    pending: boolean;
    getString: GetStringFn;
    onConfirm: () => void;
    onClose: () => void;
}

export function HrmScopeDeleteDialog({ open, scope, pending, getString, onConfirm, onClose }: Props) {
    return (
        <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
            <DialogTitle>{getString('removeScopeDepartment') || 'Remove department from scope'}</DialogTitle>
            <DialogContent>
                <DialogContentText>
                    {getString('removeScopeConfirm', { name: scope?.department_name || '' }) ||
                        `Remove "${scope?.department_name ?? ''}" from this scope?`}
                </DialogContentText>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} disabled={pending}>
                    {getString('cancel') || 'Cancel'}
                </Button>
                <Button color="error" variant="contained" onClick={onConfirm} disabled={pending}>
                    {pending ? <CircularProgress size={22} /> : getString('remove') || 'Remove'}
                </Button>
            </DialogActions>
        </Dialog>
    );
}

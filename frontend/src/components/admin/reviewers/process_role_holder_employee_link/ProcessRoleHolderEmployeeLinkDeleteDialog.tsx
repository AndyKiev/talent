// src/components/admin/reviewers/process_role_holder_employee_link/ProcessRoleHolderEmployeeLinkDeleteDialog.tsx
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Typography,
    CircularProgress,
} from '@mui/material';
import type { ProcessRoleHolderEmployeeLink } from './processRoleHolderEmployeeLinkApi';
import useString from '../../../../hooks/useString';

interface Props {
    row: ProcessRoleHolderEmployeeLink | null;
    isPending: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}

export function ProcessRoleHolderEmployeeLinkDeleteDialog({ row, isPending, onConfirm, onCancel }: Props) {
    const getString = useString();
    const who = row?.employee_name || row?.employee_code || '';

    return (
        <Dialog open={!!row} onClose={onCancel} maxWidth="xs" fullWidth>
            <DialogTitle>{getString('removeAssignment') || 'Remove Assignment'}</DialogTitle>
            <DialogContent>
                <Typography variant="body2">
                    {getString('areYouSureRemoveAssignment', { employee: who }) ||
                        `Remove employee "${who}" from this reviewer?`}
                </Typography>
            </DialogContent>
            <DialogActions>
                <Button variant="outlined" onClick={onCancel} disabled={isPending}>
                    {getString('cancel') || 'Cancel'}
                </Button>
                <Button
                    variant="contained"
                    color="error"
                    onClick={onConfirm}
                    disabled={isPending}
                    startIcon={isPending ? <CircularProgress size={16} color="inherit" /> : undefined}
                >
                    {getString('delete') || 'Delete'}
                </Button>
            </DialogActions>
        </Dialog>
    );
}

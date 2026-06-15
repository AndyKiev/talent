// src/components/developer/process_roles/process_role/ProcessRoleDeleteDialog.tsx
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Typography,
    CircularProgress,
} from '@mui/material';
import type { ProcessRole } from './processRoleApi';
import useString from '../../../../hooks/useString';

interface Props {
    row: ProcessRole | null;
    isPending: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}

export function ProcessRoleDeleteDialog({ row, isPending, onConfirm, onCancel }: Props) {
    const getString = useString();

    return (
        <Dialog open={!!row} onClose={onCancel} maxWidth="xs" fullWidth>
            <DialogTitle>{getString('deleteProcessRole') || 'Delete Role'}</DialogTitle>
            <DialogContent>
                <Typography variant="body2">
                    {getString('areYouSureDeleteProcessRole', { name: row?.name ?? '' }) ||
                        `Are you sure you want to delete "${row?.name}"?`}
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

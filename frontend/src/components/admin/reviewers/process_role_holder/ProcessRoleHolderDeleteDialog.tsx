// src/components/admin/reviewers/process_role_holder/ProcessRoleHolderDeleteDialog.tsx
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Typography,
    CircularProgress,
} from '@mui/material';
import type { ProcessRoleHolder } from './processRoleHolderApi';
import useString from '../../../../hooks/useString';

interface Props {
    row: ProcessRoleHolder | null;
    isPending: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}

export function ProcessRoleHolderDeleteDialog({ row, isPending, onConfirm, onCancel }: Props) {
    const getString = useString();
    const who = row?.holder_name || row?.holder_code || '';

    return (
        <Dialog open={!!row} onClose={onCancel} maxWidth="xs" fullWidth>
            <DialogTitle>{getString('removeReviewer') || 'Remove Reviewer'}</DialogTitle>
            <DialogContent>
                <Typography variant="body2">
                    {getString('areYouSureRemoveReviewer', { employee: who }) ||
                        `Remove reviewer "${who}"?`}
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

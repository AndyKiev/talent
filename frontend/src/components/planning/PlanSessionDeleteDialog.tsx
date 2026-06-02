// src/components/planning/PlanSessionDeleteDialog.tsx
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Typography,
    CircularProgress,
} from '@mui/material';
import type { PlanSession } from './planningApi';
import useString from '../../hooks/useString';
import str from '../../strings/str';

interface Props {
    row: PlanSession | null;
    isPending: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}

export function PlanSessionDeleteDialog({ row, isPending, onConfirm, onCancel }: Props) {
    const getString = useString({ str });

    return (
        <Dialog open={!!row} onClose={onCancel} maxWidth="xs" fullWidth>
            <DialogTitle>{getString('deletePlanSession') || 'Delete Plan Session'}</DialogTitle>
            <DialogContent>
                <Typography variant="body2">
                    {getString('areYouSureDeletePlanSession', { name: row?.name ?? '' }) ||
                        `Are you sure you want to delete "${row?.name}"? This will remove its config and plan values. This action cannot be undone.`}
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

// src/components/planning/PlanScopeDeleteDialog.tsx
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Typography,
    CircularProgress,
} from '@mui/material';
import type { PlanScope } from './planningApi';
import useString from '../../hooks/useString';
import str from '../../strings/str';

interface Props {
    row: PlanScope | null;
    isPending: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}

export function PlanScopeDeleteDialog({ row, isPending, onConfirm, onCancel }: Props) {
    const getString = useString({ str });
    const dept = row?.department?.name ?? (row ? `#${row.department_id}` : '');
    const grp = row?.job_group?.name ?? (row ? `#${row.job_group_id}` : '');
    const label = `${dept} / ${grp}`;

    return (
        <Dialog open={!!row} onClose={onCancel} maxWidth="xs" fullWidth>
            <DialogTitle>{getString('deletePlanScope') || 'Delete plan row'}</DialogTitle>
            <DialogContent>
                <Typography variant="body2">
                    {getString('areYouSureDeletePlanScope', { name: label }) ||
                        `Delete the plan row "${label}"? If it still matches the config, a re-sync will recreate it (empty).`}
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

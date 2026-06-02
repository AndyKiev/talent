// src/components/admin/planning_setup/plan_scope_default/PlanScopeDefaultDeleteDialog.tsx
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Typography,
    CircularProgress,
} from '@mui/material';
import type { PlanScopeDefault } from '../planningSetupApi';
import useString from '../../../../hooks/useString';
import str from '../../../../strings/str';

interface Props {
    row: PlanScopeDefault | null;
    isPending: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}

export function PlanScopeDefaultDeleteDialog({ row, isPending, onConfirm, onCancel }: Props) {
    const getString = useString({ str });
    const jg = row?.job_group?.name ?? (row ? `#${row.job_group_id}` : '');
    const ts = row?.talent_status
        ? row.talent_status.key
        : getString('combinedOption') || 'Combined (all)';
    const label = `${jg} / ${ts}`;

    return (
        <Dialog open={!!row} onClose={onCancel} maxWidth="xs" fullWidth>
            <DialogTitle>{getString('removePlanScopeDefault') || 'Remove Scope Profile'}</DialogTitle>
            <DialogContent>
                <Typography variant="body2">
                    {getString('areYouSureRemovePlanScopeDefault', { name: label }) ||
                        `Remove "${label}" from planning defaults? Future sessions will no longer include it.`}
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
                    {getString('remove') || 'Remove'}
                </Button>
            </DialogActions>
        </Dialog>
    );
}

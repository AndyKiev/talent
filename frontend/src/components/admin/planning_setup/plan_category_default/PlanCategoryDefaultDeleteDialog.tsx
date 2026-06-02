// src/components/admin/planning_setup/plan_category_default/PlanCategoryDefaultDeleteDialog.tsx
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Typography,
    CircularProgress,
} from '@mui/material';
import type { PlanCategoryDefault } from '../planningSetupApi';
import useString from '../../../../hooks/useString';
import str from '../../../../strings/str';

interface Props {
    row: PlanCategoryDefault | null;
    isPending: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}

export function PlanCategoryDefaultDeleteDialog({ row, isPending, onConfirm, onCancel }: Props) {
    const getString = useString({ str });
    const name = row?.department_category?.name ?? (row ? `#${row.department_category_id}` : '');

    return (
        <Dialog open={!!row} onClose={onCancel} maxWidth="xs" fullWidth>
            <DialogTitle>{getString('removePlanCategoryDefault') || 'Remove Planning Category'}</DialogTitle>
            <DialogContent>
                <Typography variant="body2">
                    {getString('areYouSureRemovePlanCategoryDefault', { name }) ||
                        `Remove "${name}" from planning defaults? Future sessions will no longer include it.`}
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

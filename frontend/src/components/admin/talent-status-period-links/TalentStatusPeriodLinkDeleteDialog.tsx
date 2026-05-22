// src/components/admin/talent-status-period-links/TalentStatusPeriodLinkDeleteDialog.tsx
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Typography,
    CircularProgress,
} from '@mui/material';
import type { TalentStatusPeriodLink } from './talentStatusPeriodLinkApi';
import useString from '../../../hooks/useString';
import str from '../../../strings/str';

interface Props {
    row: TalentStatusPeriodLink | null;
    isPending: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}

export function TalentStatusPeriodLinkDeleteDialog({ row, isPending, onConfirm, onCancel }: Props) {
    const getString = useString({ str });

    const periodName = row?.talent_period?.name ?? `#${row?.talent_period_id}`;
    const statusLabel = row?.talent_status
        ? `${row.talent_status.key} — ${row.talent_status.name}`
        : `#${row?.talent_status_id}`;

    return (
        <Dialog open={!!row} onClose={onCancel} maxWidth="xs" fullWidth>
            <DialogTitle>
                {getString('deleteTalentStatusPeriodLink') || 'Delete Status–Period Link'}
            </DialogTitle>
            <DialogContent>
                <Typography variant="body2">
                    {getString('areYouSureDeleteTalentStatusPeriodLink') ||
                        `Are you sure you want to unlink "${statusLabel}" from "${periodName}"? This action cannot be undone.`}
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
                    startIcon={
                        isPending ? <CircularProgress size={16} color="inherit" /> : undefined
                    }
                >
                    {getString('delete') || 'Delete'}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
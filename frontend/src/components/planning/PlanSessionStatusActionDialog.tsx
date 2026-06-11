// src/components/planning/PlanSessionStatusActionDialog.tsx
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

export type PlanSessionAction = 'open' | 'close' | 'revert';

export interface PendingStatusAction {
    session: PlanSession;
    action: PlanSessionAction;
}

interface Props {
    pending: PendingStatusAction | null;
    isPending: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}

const TITLE_KEY: Record<PlanSessionAction, string> = {
    open: 'openPlanSession',
    close: 'closePlanSession',
    revert: 'revertPlanSession',
};

const CONFIRM_KEY: Record<PlanSessionAction, string> = {
    open: 'areYouSureOpenPlanSession',
    close: 'areYouSureClosePlanSession',
    revert: 'areYouSureRevertPlanSession',
};

export function PlanSessionStatusActionDialog({ pending, isPending, onConfirm, onCancel }: Props) {
    const getString = useString({ str });
    const action = pending?.action;
    const name = pending?.session.name ?? '';

    return (
        <Dialog open={!!pending} onClose={onCancel} maxWidth="xs" fullWidth>
            <DialogTitle>{action ? getString(TITLE_KEY[action]) : ''}</DialogTitle>
            <DialogContent>
                <Typography variant="body2">
                    {action ? getString(CONFIRM_KEY[action], { name }) : ''}
                </Typography>
            </DialogContent>
            <DialogActions>
                <Button variant="outlined" onClick={onCancel} disabled={isPending}>
                    {getString('cancel') || 'Cancel'}
                </Button>
                <Button
                    variant="contained"
                    onClick={onConfirm}
                    disabled={isPending}
                    startIcon={isPending ? <CircularProgress size={16} color="inherit" /> : undefined}
                >
                    {getString('confirm') || 'Confirm'}
                </Button>
            </DialogActions>
        </Dialog>
    );
}

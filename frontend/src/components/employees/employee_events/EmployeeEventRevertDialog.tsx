// src/components/employees/employee_events/EmployeeEventRevertDialog.tsx
import {
    Box,
    Button,
    Chip,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Typography,
} from '@mui/material';
import ArrowRightAltIcon from '@mui/icons-material/ArrowRightAlt';
import type { GetStringFn } from '../../../types/getStringFn';
import type { EmployeeEventFlat } from './employeeEventApi';
import { formatToUkrDate } from '../../../utils/dateFormatter';
import cfl from '../../../utils/helpers.ts';
import { revertTargetOf } from './employeeEventStatus';

interface Props {
    event: EmployeeEventFlat | null;
    isPending: boolean;
    onConfirm: () => void;
    onCancel: () => void;
    getString: GetStringFn;
}

export function EmployeeEventRevertDialog({
    event,
    isPending,
    onConfirm,
    onCancel,
    getString,
}: Props) {
    const fromName = event?.status?.name ?? '';
    const toName = revertTargetOf(fromName) ?? '';
    const fromLabel = cfl(getString(fromName) || fromName);
    const toLabel = cfl(getString(toName) || toName);

    return (
        <Dialog open={!!event} onClose={onCancel} maxWidth="xs" fullWidth>
            <DialogTitle>{cfl(getString('revertEvent') || 'Revert event')}</DialogTitle>
            <DialogContent>
                {event && (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                        <Typography variant="body2">
                            {getString('areYouSureRevertEvent', { from: fromLabel, to: toLabel }) ||
                                `Are you sure you want to step this event back (${fromLabel} → ${toLabel})?`}
                        </Typography>

                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                            <Typography variant="body2" fontWeight={600}>
                                {event.event_type?.name ?? `#${event.id}`}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                ({formatToUkrDate(event.effective_date)})
                            </Typography>
                        </Box>

                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                            <Chip size="small" variant="outlined" label={fromLabel} />
                            <ArrowRightAltIcon sx={{ fontSize: 18, color: 'text.disabled' }} />
                            <Chip size="small" color="primary" variant="outlined" label={toLabel} />
                        </Box>

                        {fromName === 'applied' && (
                            <Typography variant="caption" color="text.secondary">
                                {getString('revertUnapplyHint') ||
                                    'This will un-apply the event: job, main department and talent-audit statuses are unwound (the event is kept).'}
                            </Typography>
                        )}
                    </Box>
                )}
            </DialogContent>
            <DialogActions>
                <Button variant="outlined" onClick={onCancel} disabled={isPending}>
                    {cfl(getString('cancel') || 'Cancel')}
                </Button>
                <Button
                    variant="contained"
                    color="warning"
                    onClick={onConfirm}
                    disabled={isPending}
                    startIcon={isPending ? <CircularProgress size={16} color="inherit" /> : undefined}
                >
                    {cfl(getString('revert') || 'Revert')}
                </Button>
            </DialogActions>
        </Dialog>
    );
}

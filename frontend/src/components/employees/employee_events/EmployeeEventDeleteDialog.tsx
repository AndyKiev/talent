// src/components/employees/employee_events/EmployeeEventDeleteDialog.tsx
import {
    Button,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Typography,
} from '@mui/material';
import type { GetStringFn } from '../../../types/getStringFn';
import type { EmployeeEventFlat } from './employeeEventApi';
import { formatToUkrDate } from '../../../utils/dateFormatter';
import cfl from '../../../utils/helpers.ts';

interface Props {
    event: EmployeeEventFlat | null;
    isPending: boolean;
    onConfirm: () => void;
    onCancel: () => void;
    getString: GetStringFn;
}

export function EmployeeEventDeleteDialog({
    event,
    isPending,
    onConfirm,
    onCancel,
    getString,
}: Props) {
    return (
        <Dialog open={!!event} onClose={onCancel} maxWidth="xs" fullWidth>
            <DialogTitle>{cfl(getString('deleteEvent') || 'Delete event')}</DialogTitle>
            <DialogContent>
                {event && (
                    <Typography variant="body2">
                        {getString('deleteEventConfirm') || 'Are you sure you want to delete this event?'}{' '}
                        <strong>{event.event_type?.name ?? `#${event.id}`}</strong>{' '}
                        ({formatToUkrDate(event.effective_date)})
                    </Typography>
                )}
            </DialogContent>
            <DialogActions>
                <Button variant="outlined" onClick={onCancel} disabled={isPending}>
                    {cfl(getString('cancel') || 'Cancel')}
                </Button>
                <Button
                    variant="contained"
                    color="error"
                    onClick={onConfirm}
                    disabled={isPending}
                    startIcon={isPending ? <CircularProgress size={16} color="inherit" /> : undefined}
                >
                    {cfl(getString('delete') || 'Delete')}
                </Button>
            </DialogActions>
        </Dialog>
    );
}

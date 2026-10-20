// src/components/employees/employee_events/EmployeeEventDeleteDialog.tsx
import type { GetStringFn } from '../../../types/getStringFn';
import type { EmployeeEventFlat } from './employeeEventApi';
import { formatToUkrDate } from '../../../utils/dateFormatter';
import { eventTypeLabel } from './eventLabels';
import cfl from '../../../utils/helpers.ts';
import ConfirmDeleteDialog from '../../ui/ConfirmDeleteDialog';

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
        <ConfirmDeleteDialog
            open={!!event}
            title={cfl(getString('deleteEvent') || 'Delete event')}
            message={
                event ? (
                    <>
                        {getString('deleteEventConfirm') || 'Are you sure you want to delete this event?'}{' '}
                        <strong>{eventTypeLabel(getString, event.event_type?.code)}</strong>{' '}
                        ({formatToUkrDate(event.effective_date)})
                    </>
                ) : undefined
            }
            confirmLabel={cfl(getString('delete')) || 'Delete'}
            isDeleting={isPending}
            onConfirm={onConfirm}
            onClose={onCancel}
        />
    );
}

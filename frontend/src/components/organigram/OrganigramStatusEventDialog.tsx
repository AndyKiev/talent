// src/components/organigram/OrganigramStatusEventDialog.tsx
//
// Confirmation modal for a status-changing drop in the organigram:
//   - TEMPORARY_LEAVE (maternity / conscription …): the target status is
//     picked here (only the leave-legal statuses are offered);
//   - DISMISSAL: no status pick — the backend auto-creates the
//     STATUS_CHANGE -> dismissed row.
// A wheel picker sets the effective date (defaults to the 1st of the NEXT
// month); confirming creates the employee event in one POST and shows the
// backend's translated success detail.
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    Box,
    Button,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControl,
    InputLabel,
    MenuItem,
    Select,
    Typography,
} from '@mui/material';
import dayjs from 'dayjs';
import OrganigramDateWheelPicker from './OrganigramDateWheelPicker';
import {
    createOrganigramEvent,
    type OrganigramEventChangeCreate,
} from './organigramApi';
import {
    fetchEmployeeEventStatuses,
    fetchEmployeeEventTypes,
    fetchEmployeeStatuses,
    type EmployeeEventStatusSchema,
    type EmployeeEventType,
} from '../employees/employee_events/employeeEventApi';
import { formatDate } from '../../utils/date';
import type { GetStringFn } from '../../types/getStringFn';
import cfl from '../../utils/helpers.ts';

export type OrganigramStatusEventCode = 'TEMPORARY_LEAVE' | 'DISMISSAL';

// Employee-status NAMES that are legal targets of a temporary leave
// (mirrors the event drawer).
const TEMPORARY_LEAVE_STATUSES = ['maternity', 'coscription'];

export interface OrganigramStatusEventRequest {
    employeeId: number;
    employeeName: string;
    fromJobName: string;
    fromDeptName: string;
    code: OrganigramStatusEventCode;
}

interface Props {
    request: OrganigramStatusEventRequest | null;
    getString: GetStringFn;
    onClose: () => void;
    setSnackbar: (s: { open: boolean; message: string; severity: 'success' | 'error' }) => void;
}

export function OrganigramStatusEventDialog({ request, getString, onClose, setSnackbar }: Props) {
    const qc = useQueryClient();
    const open = request != null;

    // The parent remounts this dialog per drop (key prop), so initial values
    // are fresh each time it opens. Planning default: 1st of the next month.
    const [effectiveDate, setEffectiveDate] = useState<string>(() =>
        dayjs().add(1, 'month').startOf('month').format('YYYY-MM-DD'),
    );
    const [statusId, setStatusId] = useState<number | ''>('');

    const { data: eventTypes = [] } = useQuery<EmployeeEventType[]>({
        queryKey: ['employee-event-types'],
        queryFn: fetchEmployeeEventTypes,
        staleTime: 10 * 60 * 1000,
        enabled: open,
    });
    const { data: eventStatuses = [] } = useQuery<EmployeeEventStatusSchema[]>({
        queryKey: ['employee-event-statuses'],
        queryFn: fetchEmployeeEventStatuses,
        staleTime: 10 * 60 * 1000,
        enabled: open,
    });
    const needsStatusPick = request?.code === 'TEMPORARY_LEAVE';
    const { data: employeeStatuses = [] } = useQuery({
        queryKey: ['employee-statuses'],
        queryFn: fetchEmployeeStatuses,
        staleTime: 10 * 60 * 1000,
        enabled: open && needsStatusPick,
    });
    const leaveStatusOptions = employeeStatuses.filter((s) =>
        TEMPORARY_LEAVE_STATUSES.includes(s.name),
    );

    const eventType = eventTypes.find((t) => t.code === request?.code);
    const draftStatus = eventStatuses.find((s) => s.name === 'draft');
    const statusDirId =
        eventType?.type_directions?.find(
            (d) => d.direction_type?.code === 'STATUS_CHANGE',
        )?.direction_type_id ?? null;

    const ready =
        request != null &&
        eventType != null &&
        draftStatus != null &&
        (!needsStatusPick || (statusId !== '' && statusDirId != null));

    const createMutation = useMutation({
        mutationFn: () => {
            if (!ready || !request) return Promise.reject(new Error('not ready'));
            // DISMISSAL: no explicit change — the backend auto-creates the
            // STATUS_CHANGE -> dismissed row for code-mapped event types.
            const changes: OrganigramEventChangeCreate[] = needsStatusPick
                ? [{ direction_type_id: statusDirId!, new_status_id: statusId as number }]
                : [];
            return createOrganigramEvent(request.employeeId, {
                event_type_id: eventType!.id,
                status_id: draftStatus!.id,
                effective_date: effectiveDate,
                changes,
            });
        },
        onSuccess: (res) => {
            qc.invalidateQueries({ queryKey: ['headcount_organigram'] });
            qc.invalidateQueries({ queryKey: ['headcount_calc'] });
            qc.invalidateQueries({ queryKey: ['headcount_fact_employees'] });
            if (request) qc.invalidateQueries({ queryKey: ['employee-events', request.employeeId] });
            setSnackbar({
                open: true,
                // Prefer the backend's translated success detail.
                message:
                    res.detail ||
                    getString('organigramEventCreated', {
                        type: eventType?.name ?? request?.code ?? '',
                        name: request?.employeeName ?? '',
                    }),
                severity: 'success',
            });
            onClose();
        },
        onError: (err: unknown) => {
            const msg =
                (err as { response?: { data?: { detail?: string } } })?.response?.data
                    ?.detail ?? (err as Error).message;
            setSnackbar({ open: true, message: msg, severity: 'error' });
        },
    });

    if (!request) return null;
    const thisYear = dayjs().year();

    return (
        <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
            <DialogTitle>{cfl(getString('organigramMoveTitle'))}</DialogTitle>
            <DialogContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <Typography variant="subtitle2" fontWeight={700} sx={{ flex: 1 }}>
                        {request.employeeName}
                    </Typography>
                    <Chip
                        label={eventType?.name ?? request.code}
                        size="small"
                        color={request.code === 'DISMISSAL' ? 'error' : 'warning'}
                        variant="outlined"
                    />
                </Box>

                <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                    {request.fromJobName} — {request.fromDeptName}
                </Typography>

                {/* ── Temporary leave: pick the target employee status ─────── */}
                {needsStatusPick && (
                    <FormControl fullWidth size="small" sx={{ mb: 1.5 }}>
                        <InputLabel>{cfl(getString('employeeStatus'))}</InputLabel>
                        <Select
                            variant="outlined"
                            label={cfl(getString('employeeStatus'))}
                            value={statusId}
                            onChange={(e) => setStatusId(e.target.value as number)}
                        >
                            {leaveStatusOptions.map((s) => (
                                <MenuItem key={s.id} value={s.id}>
                                    {s.name}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                )}

                <Typography variant="caption" color="text.secondary">
                    {cfl(getString('effectiveDate'))}
                </Typography>
                <Typography variant="h6" fontWeight={700} sx={{ mb: 1 }}>
                    {formatDate(effectiveDate)}
                </Typography>
                <OrganigramDateWheelPicker
                    value={effectiveDate}
                    onChange={setEffectiveDate}
                    minYear={thisYear - 1}
                    maxYear={thisYear + 10}
                />
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} disabled={createMutation.isPending}>
                    {getString('cancel')}
                </Button>
                <Button
                    variant="contained"
                    color={request.code === 'DISMISSAL' ? 'error' : 'primary'}
                    onClick={() => createMutation.mutate()}
                    disabled={createMutation.isPending || !ready}
                >
                    {getString('confirm')}
                </Button>
            </DialogActions>
        </Dialog>
    );
}

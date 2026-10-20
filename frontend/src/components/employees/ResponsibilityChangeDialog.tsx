// src/components/employees/ResponsibilityChangeDialog.tsx
// Shortcut for the RESPONSIBILITY_CHANGE event: one dialog instead of
// "add event -> open drawer -> add change -> apply" on the events tab.
// Creates the event with its RESPONSIBILITY_DEPTS_CHANGE row inline and
// applies it right away when the effective date is today or earlier
// (future dates stay `ready` for the scheduler).
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    Alert,
    Box,
    Button,
    Chip,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControl,
    InputLabel,
    MenuItem,
    Select,
} from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import {
    applyEmployeeEvent,
    createEmployeeEvent,
    fetchEmployeeEvents,
    fetchEmployeeEventStatuses,
    fetchEmployeeEventTypeDirections,
    fetchEmployeeEventTypes,
    fetchResponsibilityListCategories,
    fetchResponsibilityTypeOptions,
    type DepartmentCategoryOption,
    type EmployeeEventFull,
    type ResponsibilityTypeOption,
} from './employee_events/employeeEventApi';
import { employeeEventsQK } from './employee_events/useEmployeeEventMutations';
import { fetchEmployeeById } from './employeeApi';
import type { GetStringFn } from '../../types/getStringFn';
import { DATE_FORMAT } from '../../utils/eNums';
import cfl from '../../utils/helpers.ts';

const EVENT_TYPE_CODE = 'RESPONSIBILITY_CHANGE';
const DIRECTION_CODE = 'RESPONSIBILITY_DEPTS_CHANGE';
const OPEN_STATUSES = ['draft', 'ready'];

interface Props {
    employeeId: number;
    /** Department TYPE ids currently in the employee's responsibility area. */
    currentTypeIds: number[];
    onClose: () => void;
    onDone: (message: string) => void;
    getString: GetStringFn;
}

// axiosInstance rejects with Error(detail) when the backend sent one.
const errorDetail = (err: unknown, fallback: string) => (err as Error).message || fallback;

export function ResponsibilityChangeDialog({ employeeId, currentTypeIds, onClose, onDone, getString }: Props) {
    const qc = useQueryClient();

    const [effectiveDate, setEffectiveDate] = useState(dayjs().format('YYYY-MM-DD'));
    const [categoryPick, setCategoryPick] = useState<number | ''>('');
    // null = untouched -> show the current responsibility area (the change REPLACES the set).
    const [typeIdsPick, setTypeIdsPick] = useState<number[] | null>(null);
    const [error, setError] = useState<string | null>(null);

    // ── Lookups ───────────────────────────────────────────────────────────────
    const { data: events = [], isLoading: eventsLoading } = useQuery<EmployeeEventFull[]>({
        queryKey: employeeEventsQK(employeeId),
        queryFn: () => fetchEmployeeEvents(employeeId),
    });
    const { data: eventTypes = [] } = useQuery({
        queryKey: ['employee-event-types'],
        queryFn: fetchEmployeeEventTypes,
        staleTime: 10 * 60 * 1000,
    });
    const { data: statuses = [] } = useQuery({
        queryKey: ['employee-event-statuses'],
        queryFn: fetchEmployeeEventStatuses,
        staleTime: 10 * 60 * 1000,
    });
    const { data: employee } = useQuery({
        queryKey: ['employee', employeeId],
        queryFn: () => fetchEmployeeById(employeeId),
        staleTime: 5 * 60 * 1000,
    });
    const { data: categories = [] } = useQuery<DepartmentCategoryOption[]>({
        queryKey: ['responsibility-list-categories'],
        queryFn: fetchResponsibilityListCategories,
        staleTime: 5 * 60 * 1000,
    });

    const eventType = eventTypes.find((t) => t.code === EVENT_TYPE_CODE);
    const { data: typeDirections = [] } = useQuery({
        queryKey: ['employee-event-type-directions', eventType?.id],
        queryFn: () => fetchEmployeeEventTypeDirections(eventType!.id),
        enabled: eventType != null,
    });
    const directionTypeId = typeDirections.find(
        (d) => d.direction_type?.code === DIRECTION_CODE,
    )?.direction_type_id;

    // A sole responsibility category is the implicit pick (dropdown disabled).
    const singleCategoryId = categories.length === 1 ? categories[0].id : null;
    const categoryId: number | '' = categoryPick !== '' ? categoryPick : (singleCategoryId ?? '');

    const { data: typeOptions = [] } = useQuery<ResponsibilityTypeOption[]>({
        queryKey: ['responsibility-type-options', employeeId, categoryId],
        queryFn: () => fetchResponsibilityTypeOptions(employeeId, categoryId as number),
        enabled: categoryId !== '',
        staleTime: 5 * 60 * 1000,
    });

    const typeIds =
        typeIdsPick ?? currentTypeIds.filter((id) => typeOptions.some((o) => o.id === id));

    // ── Guards mirrored from the backend (one open event, unique date) ──────
    const hasOpenEvent = events.some((e) => OPEN_STATUSES.includes(e.status?.name ?? ''));
    const existingDates = events.map((e) => e.effective_date);
    const dateTaken = existingDates.includes(effectiveDate);
    const hasMainDepartment = employee?.main_department != null;
    const draftStatus = statuses.find((s) => s.name === 'draft');
    const appliedStatus = statuses.find((s) => s.name === 'applied');
    const isFuture = dayjs(effectiveDate).isAfter(dayjs(), 'day');

    const mutation = useMutation({
        mutationFn: async () => {
            const created = await createEmployeeEvent(employeeId, {
                event_type_id: eventType!.id,
                status_id: draftStatus!.id,
                effective_date: effectiveDate,
                changes: [
                    {
                        direction_type_id: directionTypeId!,
                        dept_changes: typeIds.map((id) => ({ department_type_id: id })),
                    },
                ],
            });
            if (isFuture || created.status?.name !== 'ready') return false;
            await applyEmployeeEvent(employeeId, created.id, appliedStatus!.id);
            return true;
        },
        onSuccess: (applied) => {
            onDone(
                applied
                    ? cfl(getString('responsibilityChanged') || 'Responsibility area changed')
                    : cfl(getString('responsibilityChangeScheduled') ||
                        'Responsibility change saved; it will be applied on the effective date'),
            );
        },
        onError: (err: unknown) => setError(errorDetail(err, 'Error changing responsibility')),
        // Refresh even on a partial failure (event created, apply failed) so
        // the open event shows on the events tab.
        onSettled: () => {
            qc.invalidateQueries({ queryKey: employeeEventsQK(employeeId) });
            qc.invalidateQueries({ queryKey: ['responsibility-history', employeeId] });
            qc.invalidateQueries({ queryKey: ['employee', employeeId] });
            qc.invalidateQueries({ queryKey: ['employee_responsibility_departments', employeeId] });
        },
    });

    // Why the form cannot be submitted (null = it can).
    const blocker = eventsLoading
        ? null
        : events.length === 0
            ? cfl(getString('activationRequiredFirst') || 'The employee has no activation event yet')
            : hasOpenEvent
                ? cfl(getString('openEventExistsHint') ||
                    'Apply or delete the open event on the events tab first')
                : !hasMainDepartment
                    ? cfl(getString('responsibilityNeedsMainDept') ||
                        'Assign a main department first to choose responsibility departments')
                    : categories.length === 0
                        ? cfl(getString('noResponsibilityCategories') ||
                            'No responsibility categories configured')
                        : null;

    const canSubmit =
        !blocker &&
        !eventsLoading &&
        !dateTaken &&
        !!effectiveDate &&
        typeIds.length > 0 &&
        eventType != null &&
        directionTypeId != null &&
        draftStatus != null &&
        appliedStatus != null &&
        !mutation.isPending;

    const label = cfl(getString('responsibilityDepts') || 'Responsibility departments');
    const categoryLabel = cfl(getString('departmentCategory') || 'Department category');

    return (
        <Dialog open onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>{cfl(getString('changeResponsibility') || 'Change responsibility area')}</DialogTitle>
            <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: '16px !important' }}>
                {eventsLoading ? (
                    <CircularProgress size={24} />
                ) : blocker ? (
                    <Alert severity="info">{blocker}</Alert>
                ) : (
                    <>
                        <LocalizationProvider dateAdapter={AdapterDayjs}>
                            <DatePicker
                                label={cfl(getString('effectiveDate') || 'Effective date')}
                                format={DATE_FORMAT}
                                value={effectiveDate ? dayjs(effectiveDate) : null}
                                onChange={(v) => {
                                    const d = v ? dayjs(v) : null;
                                    setEffectiveDate(d && d.isValid() ? d.format('YYYY-MM-DD') : '');
                                }}
                                shouldDisableDate={(d) =>
                                    existingDates.includes(dayjs(d).format('YYYY-MM-DD'))
                                }
                                slotProps={{
                                    textField: {
                                        size: 'small',
                                        fullWidth: true,
                                        error: dateTaken,
                                        helperText: dateTaken
                                            ? getString('dateAlreadyUsed') ||
                                              'An event already exists on this date'
                                            : undefined,
                                    },
                                }}
                            />
                        </LocalizationProvider>

                        <FormControl fullWidth size="small">
                            <InputLabel>{categoryLabel}</InputLabel>
                            <Select
                                variant="outlined"
                                value={categoryId}
                                label={categoryLabel}
                                disabled={singleCategoryId != null}
                                onChange={(e) => {
                                    setCategoryPick(e.target.value as number);
                                    setTypeIdsPick(null);
                                }}
                            >
                                {categories.map((c) => (
                                    <MenuItem key={c.id} value={c.id}>
                                        {c.name}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        {categoryId !== '' && (
                            <FormControl fullWidth size="small">
                                <InputLabel>{label}</InputLabel>
                                <Select
                                    multiple
                                    variant="outlined"
                                    value={typeIds}
                                    label={label}
                                    onChange={(e) =>
                                        setTypeIdsPick(
                                            typeof e.target.value === 'string'
                                                ? []
                                                : (e.target.value as number[]),
                                        )
                                    }
                                    renderValue={(selected) => (
                                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                            {(selected as number[]).map((id) => (
                                                <Chip
                                                    key={id}
                                                    size="small"
                                                    label={typeOptions.find((o) => o.id === id)?.name ?? `#${id}`}
                                                />
                                            ))}
                                        </Box>
                                    )}
                                >
                                    {typeOptions.map((o) => (
                                        <MenuItem key={o.id} value={o.id}>
                                            {o.name}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        )}

                        {isFuture && (
                            <Alert severity="info">
                                {cfl(getString('responsibilityFutureHint') ||
                                    'A future date is applied automatically on that day')}
                            </Alert>
                        )}
                    </>
                )}

                {error && (
                    <Alert severity="error" onClose={() => setError(null)}>
                        {error}
                    </Alert>
                )}
            </DialogContent>

            <DialogActions>
                <Button variant="outlined" onClick={onClose} disabled={mutation.isPending}>
                    {cfl(getString('cancel') || 'Cancel')}
                </Button>
                <Button
                    variant="contained"
                    onClick={() => mutation.mutate()}
                    disabled={!canSubmit}
                    startIcon={mutation.isPending ? <CircularProgress size={16} color="inherit" /> : undefined}
                >
                    {cfl(getString('save') || 'Save')}
                </Button>
            </DialogActions>
        </Dialog>
    );
}

// src/components/employees/employee_events/EmployeeEventCreateDialog.tsx
// One dialog for the whole event: type -> the type's direction pickers ->
// optional "apply now". Creates the event with its change rows inline and,
// when "apply now" is on and the date is not in the future, applies it at once
// (future dates stay `ready` for the scheduler). Mounted fresh on each open.
import { useState } from 'react';
import { useForm, useWatch, Controller } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    Alert,
    Box,
    Button,
    Checkbox,
    CircularProgress,
    Collapse,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControl,
    FormControlLabel,
    FormHelperText,
    InputLabel,
    MenuItem,
    Select,
    TextField,
    Typography,
} from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import {
    applyEmployeeEvent,
    createEmployeeEvent,
    fetchDepartments,
    fetchEmployeeEventStatuses,
    fetchEmployeeEventTypes,
    fetchEmployeeStatuses,
    type DepartmentOption,
    type EmployeeEventChangeCreate,
    type EmployeeEventFlat,
    type EmployeeEventType,
    type EmployeeEventStatusSchema,
    type EmployeeStatusOption,
} from './employeeEventApi';
import { fetchEmployeeById } from '../employeeApi';
import { employeeEventsQK } from './useEmployeeEventMutations';
import { useEventJobOptions } from './useEventJobOptions';
import { MainDepartmentPicker } from './MainDepartmentPicker';
import { ResponsibilityTypesPicker } from './ResponsibilityTypesPicker';
import {
    directionTypeLabel,
    employeeStatusLabel,
    eventTypeLabel,
    isEventTypeAllowedForStatus,
    STATUS_AUTO_CODES,
    TEMPORARY_LEAVE_STATUSES,
} from './eventLabels';
import type { GetStringFn } from '../../../types/getStringFn';
import { DATE_FORMAT } from '../../../utils/eNums';
import cfl from '../../../utils/helpers.ts';

interface FormValues {
    event_type_id: number | '';
    effective_date: string;
    description: string;
    apply_now: boolean;
    job_id: number | '';
    status_id: number | '';
}

interface Props {
    employeeId: number;
    events: EmployeeEventFlat[];
    onClose: () => void;
    /** Reports the outcome to the page snackbar. */
    onNotify: (message: string, severity: 'success' | 'error') => void;
    getString: GetStringFn;
}

// Fixed render order of the direction sections (dependency order: the job
// list follows the chosen department).
const DIRECTION_ORDER = ['MAIN_DEPT_CHANGE', 'JOB_CHANGE', 'STATUS_CHANGE', 'RESPONSIBILITY_DEPTS_CHANGE'];

/** A sole option is the implicit pick; an explicit pick always wins. */
const pickOrSole = <T,>(picked: T | '', options: { id: T }[]): T | '' =>
    picked !== '' ? picked : options.length === 1 ? options[0].id : '';

export function EmployeeEventCreateDialog({ employeeId, events, onClose, onNotify, getString }: Props) {
    const qc = useQueryClient();

    const { control, handleSubmit, setValue, formState: { errors } } = useForm<FormValues>({
        defaultValues: {
            event_type_id: '',
            effective_date: dayjs().format('YYYY-MM-DD'),
            description: '',
            apply_now: true,
            job_id: '',
            status_id: '',
        },
    });
    // Multi-step pickers keep their own drill-down state; only the result lives here.
    const [mainDeptId, setMainDeptId] = useState<number | null>(null);
    const [respTypeIds, setRespTypeIds] = useState<number[]>([]);

    // ── Lookups ───────────────────────────────────────────────────────────────
    const { data: eventTypes = [] } = useQuery<EmployeeEventType[]>({
        queryKey: ['employee-event-types'],
        queryFn: fetchEmployeeEventTypes,
        staleTime: 10 * 60 * 1000,
    });
    const { data: eventStatuses = [] } = useQuery<EmployeeEventStatusSchema[]>({
        queryKey: ['employee-event-statuses'],
        queryFn: fetchEmployeeEventStatuses,
        staleTime: 10 * 60 * 1000,
    });
    const { data: employee } = useQuery({
        queryKey: ['employee', employeeId],
        queryFn: () => fetchEmployeeById(employeeId),
        staleTime: 5 * 60 * 1000,
    });
    const { data: departments = [] } = useQuery<DepartmentOption[]>({
        queryKey: ['departments-lookup'],
        queryFn: fetchDepartments,
        staleTime: 10 * 60 * 1000,
    });
    const { data: employeeStatuses = [] } = useQuery<EmployeeStatusOption[]>({
        queryKey: ['employee-statuses-lookup'],
        queryFn: fetchEmployeeStatuses,
        staleTime: 10 * 60 * 1000,
    });

    const draftStatus = eventStatuses.find((s) => s.name === 'draft');
    const appliedStatus = eventStatuses.find((s) => s.name === 'applied');

    // Activation-first: no events -> only ACTIVATION; otherwise never ACTIVATION.
    // Status-moving types are offered only from a status they may start from.
    const hasAnyEvent = events.length > 0;
    const employeeStatusName = employee?.status?.name ?? null;
    const selectableTypes = eventTypes.filter((et) =>
        hasAnyEvent
            ? et.code !== 'ACTIVATION' && isEventTypeAllowedForStatus(et.code, employeeStatusName)
            : et.code === 'ACTIVATION',
    );

    const [pickedTypeId, effectiveDate, applyNowPick, pickedJobId, pickedStatusId] = useWatch({
        control,
        name: ['event_type_id', 'effective_date', 'apply_now', 'job_id', 'status_id'],
    });
    const eventTypeId = pickOrSole(pickedTypeId, selectableTypes);
    const eventType = eventTypes.find((t) => t.id === eventTypeId);
    const eventCode = eventType?.code ?? '';

    // Directions ship with the type itself — no second fetch (and no extra
    // render stage) when the type changes.
    // STATUS_CHANGE of auto-status types is created by the backend.
    const directions = [...(eventType?.type_directions ?? [])]
        .filter((d) => !(d.direction_type?.code === 'STATUS_CHANGE' && STATUS_AUTO_CODES.includes(eventCode)))
        .sort((a, b) => a.sort_order - b.sort_order);
    const hasDirection = (code: string) => directions.some((d) => d.direction_type?.code === code);
    const eventTypeHasMainDept = hasDirection('MAIN_DEPT_CHANGE');

    // ── Options ───────────────────────────────────────────────────────────────
    const currentMainDeptId = employee?.main_department?.department_id ?? null;
    const currentMainDeptIds = currentMainDeptId != null ? [currentMainDeptId] : [];
    const currentMainDept = departments.find((d) => d.id === currentMainDeptId);
    const { jobs: jobOptions, isLoading: jobsLoading } = useEventJobOptions({
        enabled: hasDirection('JOB_CHANGE'),
        eventTypeHasMainDept,
        newMainDeptId: mainDeptId,
        currentMainDeptId,
        currentJobId: employee?.job_id ?? null,
        departments,
    });
    const statusOptions =
        eventCode === 'TEMPORARY_LEAVE'
            ? employeeStatuses.filter((s) => TEMPORARY_LEAVE_STATUSES.includes(s.name))
            : employeeStatuses;
    const jobId = pickOrSole(pickedJobId, jobOptions);
    const statusId = pickOrSole(pickedStatusId, statusOptions);

    // ── Filled / missing directions ───────────────────────────────────────────
    const isFilled = (code: string) => {
        switch (code) {
            case 'MAIN_DEPT_CHANGE': return mainDeptId != null;
            case 'JOB_CHANGE': return jobId !== '';
            case 'STATUS_CHANGE': return statusId !== '';
            case 'RESPONSIBILITY_DEPTS_CHANGE': return respTypeIds.length > 0;
            default: return false;
        }
    };
    const requiredMissing = directions.filter((d) => d.is_required && !isFilled(d.direction_type?.code ?? ''));

    const buildChange = (directionTypeId: number, code: string): EmployeeEventChangeCreate | null => {
        if (!isFilled(code)) return null;
        switch (code) {
            case 'MAIN_DEPT_CHANGE': return { direction_type_id: directionTypeId, new_department_id: mainDeptId };
            case 'JOB_CHANGE': return { direction_type_id: directionTypeId, new_job_id: jobId as number };
            case 'STATUS_CHANGE': return { direction_type_id: directionTypeId, new_status_id: statusId as number };
            case 'RESPONSIBILITY_DEPTS_CHANGE':
                return {
                    direction_type_id: directionTypeId,
                    dept_changes: respTypeIds.map((id) => ({ department_type_id: id })),
                };
            default: return null;
        }
    };

    // ── Guards mirrored from the backend ──────────────────────────────────────
    const existingDates = events.map((e) => e.effective_date);
    const dateTaken = !!effectiveDate && existingDates.includes(effectiveDate);
    const hasOpenEvent = events.some(
        (e) => e.status?.name === 'draft' || e.status?.name === 'ready',
    );
    const isFuture = !!effectiveDate && dayjs(effectiveDate).isAfter(dayjs(), 'day');
    const applyNow = applyNowPick && !isFuture;

    // ── Create (+ apply) ──────────────────────────────────────────────────────
    const mutation = useMutation({
        mutationFn: async (values: FormValues) => {
            const changes = directions
                .map((d) => buildChange(d.direction_type_id, d.direction_type?.code ?? ''))
                .filter((c): c is EmployeeEventChangeCreate => c != null);
            const created = await createEmployeeEvent(employeeId, {
                event_type_id: eventTypeId as number,
                status_id: draftStatus!.id,
                effective_date: values.effective_date,
                description: values.description || undefined,
                changes,
            });
            if (!applyNow || created.status?.name !== 'ready') return false;
            try {
                await applyEmployeeEvent(employeeId, created.id, appliedStatus!.id);
            } catch (err) {
                // The event exists now (ready) — close and let the user retry from the drawer.
                onNotify((err as Error).message || 'Error applying event', 'error');
                onClose();
                return null;
            }
            return true;
        },
        onSuccess: (applied) => {
            if (applied === null) return;
            onNotify(
                applied
                    ? cfl(getString('eventApplied') || 'Event applied')
                    : cfl(getString('eventCreated') || 'Event created'),
                'success',
            );
            onClose();
        },
        onError: (err: unknown) => onNotify((err as Error).message || 'Error creating event', 'error'),
        onSettled: () => {
            qc.invalidateQueries({ queryKey: employeeEventsQK(employeeId) });
            qc.invalidateQueries({ queryKey: ['employee', employeeId] });
            qc.invalidateQueries({ queryKey: ['employee_departments', employeeId] });
            qc.invalidateQueries({ queryKey: ['employees'] });
        },
    });

    const blocker = hasOpenEvent
        ? cfl(getString('openEventExistsHint') || 'Apply or delete the open event on the events tab first')
        : null;

    const canSubmit =
        !blocker &&
        eventTypeId !== '' &&
        !!effectiveDate &&
        !dateTaken &&
        draftStatus != null &&
        appliedStatus != null &&
        !(applyNow && requiredMissing.length > 0) &&
        !mutation.isPending;

    const requiredMark = (required: boolean) => (required ? ' *' : '');

    return (
        <Dialog open onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>{cfl(getString('addEvent') || 'Add event')}</DialogTitle>
            <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '16px !important' }}>
                {blocker && <Alert severity="info">{blocker}</Alert>}
                <LocalizationProvider dateAdapter={AdapterDayjs}>
                    {/* Event type */}
                    <Controller
                        name="event_type_id"
                        control={control}
                        render={({ field }) => (
                            <FormControl fullWidth size="small" error={!!errors.event_type_id}>
                                <InputLabel>{cfl(getString('eventType') || 'Event type')}</InputLabel>
                                <Select
                                    variant="outlined"
                                    value={eventTypeId}
                                    label={cfl(getString('eventType') || 'Event type')}
                                    disabled={!!blocker}
                                    onChange={(e) => {
                                        field.onChange(e.target.value as number);
                                        // A new type has other directions: drop the old values.
                                        setValue('job_id', '');
                                        setValue('status_id', '');
                                        setMainDeptId(null);
                                        setRespTypeIds([]);
                                    }}
                                >
                                    {selectableTypes.map((et) => (
                                        <MenuItem key={et.id} value={et.id}>
                                            {eventTypeLabel(getString, et.code)}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        )}
                    />

                    {/* Effective date */}
                    <Controller
                        name="effective_date"
                        control={control}
                        rules={{ required: cfl(getString('fieldRequired') || 'Required') }}
                        render={({ field }) => (
                            <DatePicker
                                label={cfl(getString('effectiveDate') || 'Effective date')}
                                format={DATE_FORMAT}
                                value={field.value ? dayjs(field.value) : null}
                                onChange={(v) => {
                                    const d = v ? dayjs(v) : null;
                                    field.onChange(d && d.isValid() ? d.format('YYYY-MM-DD') : '');
                                }}
                                shouldDisableDate={(d) => existingDates.includes(dayjs(d).format('YYYY-MM-DD'))}
                                slotProps={{
                                    textField: {
                                        size: 'small',
                                        fullWidth: true,
                                        error: !!errors.effective_date || dateTaken,
                                        helperText: dateTaken
                                            ? getString('dateAlreadyUsed') || 'An event already exists on this date'
                                            : errors.effective_date?.message,
                                    },
                                }}
                            />
                        )}
                    />
                </LocalizationProvider>

                {/* Direction sections: always in the same order, each slides in/out
                    when the type changes (a section shared by both types stays put).
                    One flex item whose -mt cancels the parent gap; each open section
                    brings its own top spacing, so collapsed ones leave none. */}
                <Box sx={{ mt: -2 }}>
                {DIRECTION_ORDER.map((code) => {
                    const d = directions.find((x) => x.direction_type?.code === code);
                    const label = directionTypeLabel(getString, code) + requiredMark(!!d?.is_required);
                    return (
                        <Collapse key={code} in={!!d} unmountOnExit>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, pt: 2 }}>
                            <Typography variant="subtitle2" fontWeight={600}>{label}</Typography>

                            {code === 'MAIN_DEPT_CHANGE' && (
                                <MainDepartmentPicker
                                    key={eventTypeId}
                                    value={mainDeptId}
                                    onChange={(id) => {
                                        setMainDeptId(id);
                                        setValue('job_id', ''); // job list follows the department's type
                                    }}
                                    currentMainDeptIds={eventCode === 'ACTIVATION' ? [] : currentMainDeptIds}
                                    getString={getString}
                                />
                            )}

                            {code === 'JOB_CHANGE' && (
                                <Controller
                                    name="job_id"
                                    control={control}
                                    render={({ field }) => (
                                        <FormControl fullWidth size="small" disabled={(eventTypeHasMainDept && mainDeptId == null) || jobsLoading}>
                                            <InputLabel>{cfl(getString('job') || 'Job')}</InputLabel>
                                            <Select
                                                variant="outlined"
                                                value={jobsLoading ? '' : jobId}
                                                label={cfl(getString('job') || 'Job')}
                                                onChange={(e) => field.onChange(e.target.value as number)}
                                                endAdornment={jobsLoading ? <CircularProgress size={18} sx={{ mr: 3 }} /> : undefined}
                                            >
                                                {jobOptions.map((j) => (
                                                    <MenuItem key={j.id} value={j.id}>{j.name}</MenuItem>
                                                ))}
                                            </Select>
                                            <FormHelperText>
                                                {eventTypeHasMainDept
                                                    ? mainDeptId == null
                                                        ? cfl(getString('chooseDepartmentFirst') || 'Choose the department first')
                                                        : ' '
                                                    : `${cfl(getString('promotionWithin') || 'Promotion within')}: ${currentMainDept?.name ?? '—'}`}
                                            </FormHelperText>
                                        </FormControl>
                                    )}
                                />
                            )}

                            {code === 'STATUS_CHANGE' && (
                                <Controller
                                    name="status_id"
                                    control={control}
                                    render={({ field }) => (
                                        <FormControl fullWidth size="small">
                                            <InputLabel>{cfl(getString('employeeStatus') || 'Status')}</InputLabel>
                                            <Select
                                                variant="outlined"
                                                value={statusId}
                                                label={cfl(getString('employeeStatus') || 'Status')}
                                                onChange={(e) => field.onChange(e.target.value as number)}
                                            >
                                                {statusOptions.map((s) => (
                                                    <MenuItem key={s.id} value={s.id}>
                                                        {employeeStatusLabel(getString, s.name)}
                                                    </MenuItem>
                                                ))}
                                            </Select>
                                        </FormControl>
                                    )}
                                />
                            )}

                            {code === 'RESPONSIBILITY_DEPTS_CHANGE' && (
                                <ResponsibilityTypesPicker
                                    key={eventTypeId}
                                    employeeId={employeeId}
                                    hasMainDepartment={currentMainDeptId != null}
                                    value={respTypeIds}
                                    onChange={setRespTypeIds}
                                    getString={getString}
                                />
                            )}
                        </Box>
                        </Collapse>
                    );
                })}
                </Box>

                {/* Description */}
                <Controller
                    name="description"
                    control={control}
                    render={({ field }) => (
                        <TextField
                            {...field}
                            label={cfl(getString('description') || 'Description')}
                            size="small"
                            fullWidth
                            multiline
                            minRows={2}
                            maxRows={4}
                        />
                    )}
                />

                {/* Apply now */}
                <Controller
                    name="apply_now"
                    control={control}
                    render={({ field }) => (
                        <Box>
                            <FormControlLabel
                                control={
                                    <Checkbox
                                        checked={field.value && !isFuture}
                                        disabled={isFuture}
                                        onChange={(e) => field.onChange(e.target.checked)}
                                    />
                                }
                                label={cfl(getString('applyEventNow') || 'Apply the event right away')}
                            />
                            <Collapse in={isFuture}>
                                <FormHelperText sx={{ mt: 0 }}>
                                    {cfl(getString('eventFutureAppliedOnDate') ||
                                        'A future-dated event is applied automatically on its effective date')}
                                </FormHelperText>
                            </Collapse>
                            <Collapse in={applyNow && requiredMissing.length > 0}>
                                <FormHelperText sx={{ mt: 0 }}>
                                    {cfl(getString('requiredDirectionsMissing') || 'Required directions not filled')}:{' '}
                                    {requiredMissing.map((r) => directionTypeLabel(getString, r.direction_type?.code)).join(', ')}
                                </FormHelperText>
                            </Collapse>
                        </Box>
                    )}
                />
            </DialogContent>

            <DialogActions>
                <Button variant="outlined" onClick={onClose} disabled={mutation.isPending}>
                    {cfl(getString('cancel') || 'Cancel')}
                </Button>
                <Button
                    variant="contained"
                    onClick={handleSubmit((values) => mutation.mutate(values))}
                    disabled={!canSubmit}
                    startIcon={mutation.isPending ? <CircularProgress size={16} color="inherit" /> : undefined}
                >
                    {applyNow
                        ? cfl(getString('createAndApply') || 'Create and apply')
                        : cfl(getString('create') || 'Create')}
                </Button>
            </DialogActions>
        </Dialog>
    );
}

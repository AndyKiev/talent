// src/components/employees/employee_events/EmployeeEventDrawer.tsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Alert,
    Box,
    Button,
    Chip,
    CircularProgress,
    Divider,
    Drawer,
    FormControl,
    IconButton,
    InputLabel,
    MenuItem,
    Select,
    Tooltip,
    Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import {
    fetchEmployeeEvent,
    fetchEmployeeEventTypeDirections,
    fetchEmployeeEventStatuses,
    fetchEmployeeStatuses,
    fetchDepartments,
    createEventChange,
    deleteEventChange,
    applyEmployeeEvent,
    updateEmployeeEvent,
    type EmployeeEventFlat,
    type EmployeeEventFull,
    type EmployeeEventTypeDirectionNested,
    type EmployeeEventChangeCreate,
    type EmployeeStatusOption,
    type DepartmentOption,
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
    STATUS_AUTO_CODES,
    TEMPORARY_LEAVE_STATUSES,
} from './eventLabels';
import type { GetStringFn } from '../../../types/getStringFn';
import cfl from '../../../utils/helpers.ts';
import { DATE_FORMAT } from '../../../utils/eNums';
import { departmentMapById, departmentPathLabel } from '../../../utils/departmentPath';

interface Props {
    event: EmployeeEventFlat | null;
    employeeId: number;
    /** Effective dates of the employee's OTHER events — cannot be reused. */
    otherEventDates: string[];
    onClose: () => void;
    /** Reports outcomes to the page snackbar. */
    onNotify: (message: string, severity: 'success' | 'error') => void;
    getString: GetStringFn;
}

const DIRECTION_CODE_TO_FIELDS: Record<string, { new_: 'new_job_id' | 'new_status_id' | 'new_department_id'; label: string }> = {
    JOB_CHANGE: { new_: 'new_job_id', label: 'job' },
    STATUS_CHANGE: { new_: 'new_status_id', label: 'employeeStatus' },
    MAIN_DEPT_CHANGE: { new_: 'new_department_id', label: 'mainDepartment' },
};

/** A sole option is the implicit pick; an explicit pick always wins. */
const pickOrSole = <T,>(picked: T | '', options: { id: T }[]): T | '' =>
    picked !== '' ? picked : options.length === 1 ? options[0].id : '';

export function EmployeeEventDrawer({ event, employeeId, otherEventDates, onClose, onNotify, getString }: Props) {
    const qc = useQueryClient();
    const open = !!event;

    // ── Fetch full event detail ───────────────────────────────────────────────
    const { data: fullEvent, isLoading: eventLoading } = useQuery<EmployeeEventFull>({
        queryKey: ['employee-event-detail', employeeId, event?.id],
        queryFn: () => fetchEmployeeEvent(employeeId, event!.id),
        enabled: !!event,
    });

    // Status comes from the freshly-fetched detail when available, so the
    // drawer reflects draft<->ready flips immediately (the `event` prop is the
    // stale grid row). Falls back to the prop while the detail is loading.
    const statusName = fullEvent?.status?.name ?? event?.status?.name ?? '';
    const isDraft = statusName === 'draft';
    const isReady = statusName === 'ready';
    const isEditable = isDraft || isReady;
    const savedDate = fullEvent?.effective_date ?? event?.effective_date ?? '';

    // ── Fetch allowed directions for this event type ──────────────────────────
    const { data: typeDirections = [] } = useQuery<EmployeeEventTypeDirectionNested[]>({
        queryKey: ['employee-event-type-directions', event?.event_type_id],
        queryFn: () => fetchEmployeeEventTypeDirections(event!.event_type_id),
        enabled: !!event,
    });

    // ── Lookups ───────────────────────────────────────────────────────────────
    const { data: employeeStatuses = [] } = useQuery<EmployeeStatusOption[]>({
        queryKey: ['employee-statuses-lookup'],
        queryFn: fetchEmployeeStatuses,
        staleTime: 10 * 60 * 1000,
        enabled: open,
    });

    const { data: departments = [] } = useQuery<DepartmentOption[]>({
        queryKey: ['departments-lookup'],
        queryFn: fetchDepartments,
        staleTime: 10 * 60 * 1000,
        enabled: open,
    });

    const { data: eventStatuses = [] } = useQuery({
        queryKey: ['employee-event-statuses'],
        queryFn: fetchEmployeeEventStatuses,
        staleTime: 10 * 60 * 1000,
        enabled: open,
    });

    // Employee — current job / main department drive the option exclusions.
    const { data: employee } = useQuery({
        queryKey: ['employee', employeeId],
        queryFn: () => fetchEmployeeById(employeeId),
        enabled: open,
        staleTime: 5 * 60 * 1000,
    });

    const errorText = (err: unknown, fallback: string) => (err as Error).message || fallback;
    const refreshEvent = () => {
        qc.invalidateQueries({ queryKey: ['employee-event-detail', employeeId, event?.id] });
        // Also refresh the events list so the draft -> ready status flip
        // shows in the grid without a manual page refresh.
        qc.invalidateQueries({ queryKey: employeeEventsQK(employeeId) });
    };

    // ── Add change mutation ───────────────────────────────────────────────────
    const addChangeMutation = useMutation({
        mutationFn: (payload: EmployeeEventChangeCreate) =>
            createEventChange(employeeId, event!.id, payload),
        onSuccess: () => {
            refreshEvent();
            onNotify(cfl(getString('changeAdded') || 'Change added'), 'success');
        },
        onError: (err: unknown) => onNotify(errorText(err, 'Error adding change'), 'error'),
    });

    // ── Effective date (editable while not applied) ───────────────────────────
    // The picker shows the new date at once (mutation.variables while pending)
    // and stays enabled — a spinner beside it marks the save. onSuccess writes
    // the saved date into the detail cache, so there is no old-date flash
    // between "save done" and "refetch done".
    const detailQK = ['employee-event-detail', employeeId, event?.id];
    const dateMutation = useMutation({
        mutationFn: (date: string) => updateEmployeeEvent(employeeId, event!.id, { effective_date: date }),
        onSuccess: (_saved, date) => {
            qc.setQueryData<EmployeeEventFull>(detailQK, (old) => (old ? { ...old, effective_date: date } : old));
            qc.invalidateQueries({ queryKey: employeeEventsQK(employeeId) });
            onNotify(cfl(getString('eventUpdated') || 'Event updated'), 'success');
        },
        onError: (err: unknown) => onNotify(errorText(err, 'Error updating event'), 'error'),
    });

    // ── Apply event mutation ──────────────────────────────────────────────────
    const applyMutation = useMutation({
        mutationFn: () => {
            const appliedStatus = eventStatuses.find((s) => s.name === 'applied');
            if (!appliedStatus) throw new Error('Applied status not found');
            return applyEmployeeEvent(employeeId, event!.id, appliedStatus.id);
        },
        onSuccess: () => {
            refreshEvent();
            // Applying writes status/job/department to the employee — refresh
            // the employees grid and the single-employee projection.
            qc.invalidateQueries({ queryKey: ['employees'] });
            qc.invalidateQueries({ queryKey: ['employee', employeeId] });
            qc.invalidateQueries({ queryKey: ['employee_departments', employeeId] });
            onNotify(cfl(getString('eventApplied') || 'Event applied'), 'success');
            onClose();
        },
        onError: (err: unknown) => onNotify(errorText(err, 'Error applying event'), 'error'),
    });

    // ── Delete change mutation ────────────────────────────────────────────────
    const deleteChangeMutation = useMutation({
        mutationFn: (changeId: number) =>
            deleteEventChange(employeeId, event!.id, changeId),
        onSuccess: () => {
            refreshEvent();
            onNotify(cfl(getString('changeRemoved') || 'Change removed'), 'success');
        },
        onError: (err: unknown) => onNotify(errorText(err, 'Error removing change'), 'error'),
    });

    // Department id -> "Root - Dept" labels (e.g. "Почайна - Комерція") so a
    // department change always names its MAIN (root) instance too.
    const deptById = departmentMapById(departments);
    const deptLabel = (deptId: number | null | undefined, fallback?: string | null) =>
        departmentPathLabel(deptId, deptById) ?? fallback ?? '—';

    const effectiveDate = dateMutation.isPending && dateMutation.variables ? dateMutation.variables : savedDate;

    // ── Saved main department (drives job filtering) ──────────────────────────
    const savedMainDeptId =
        (fullEvent?.changes ?? []).find((c) => c.direction_type?.code === 'MAIN_DEPT_CHANGE')
            ?.new_department_id ?? null;

    // ── Which directions are already filled ───────────────────────────────────
    const existingDirectionTypeIds = new Set(
        (fullEvent?.changes ?? []).map((c) => c.direction_type_id),
    );

    const eventCode = event?.event_type?.code ?? '';
    // Whether this event type changes the main department (e.g. TRANSFER).
    // PROMOTION-like types have no MAIN_DEPT_CHANGE direction → the job changes
    // WITHIN the current main department, so its job list comes from that dept.
    const eventTypeHasMainDept = typeDirections.some(
        (d) => d.direction_type?.code === 'MAIN_DEPT_CHANGE',
    );

    // Directions that still need to be filled.
    // - STATUS_CHANGE hidden for auto-status event types (backend creates it).
    // - JOB_CHANGE hidden until a MAIN_DEPT_CHANGE row is saved when the type
    //   has one (job list depends on the chosen department's type).
    const missingDirections = typeDirections.filter((td) => {
        if (existingDirectionTypeIds.has(td.direction_type_id)) return false;
        const code = td.direction_type?.code ?? '';
        if (code === 'STATUS_CHANGE' && STATUS_AUTO_CODES.includes(eventCode)) return false;
        if (code === 'JOB_CHANGE' && eventTypeHasMainDept && savedMainDeptId == null) return false;
        return true;
    });

    // ── Current employee state (for exclusions in TRANSFER / PROMOTION) ───────
    const currentMainDeptId = employee?.main_department?.department_id ?? null;
    const currentMainDeptIds = currentMainDeptId != null ? [currentMainDeptId] : [];
    const currentMainDept = departments.find((d) => d.id === currentMainDeptId);

    // ── Add change form state (one direction at a time) ───────────────────────
    const [directionPick, setDirectionPick] = useState<number | ''>('');
    const [valuePick, setValuePick] = useState<number | ''>('');
    const [mainDeptId, setMainDeptId] = useState<number | null>(null);
    const [respTypeIds, setRespTypeIds] = useState<number[]>([]);

    // A sole missing direction is picked automatically.
    const addingDirectionId = pickOrSole(
        directionPick,
        missingDirections.map((td) => ({ id: td.direction_type_id })),
    );
    const addingDirection = typeDirections.find((td) => td.direction_type_id === addingDirectionId);
    const addingCode = addingDirection?.direction_type?.code ?? '';

    const { jobs: jobOptions, isLoading: jobsLoading } = useEventJobOptions({
        enabled: open && addingCode === 'JOB_CHANGE',
        eventTypeHasMainDept,
        newMainDeptId: savedMainDeptId,
        currentMainDeptId,
        currentJobId: employee?.job_id ?? null,
        departments,
    });
    const statusOptions =
        eventCode === 'TEMPORARY_LEAVE'
            ? employeeStatuses.filter((s) => TEMPORARY_LEAVE_STATUSES.includes(s.name))
            : employeeStatuses;
    const valueOptions =
        addingCode === 'JOB_CHANGE'
            ? jobOptions.map((j) => ({ id: j.id, label: j.name }))
            : addingCode === 'STATUS_CHANGE'
                ? statusOptions.map((s) => ({ id: s.id, label: employeeStatusLabel(getString, s.name) }))
                : [];
    const newValue = pickOrSole(valuePick, valueOptions);

    const resetAddForm = () => {
        setDirectionPick('');
        setValuePick('');
        setMainDeptId(null);
        setRespTypeIds([]);
    };

    const handleAddChange = () => {
        if (addingDirectionId === '' || !addingCode) return;
        let payload: EmployeeEventChangeCreate;
        if (addingCode === 'RESPONSIBILITY_DEPTS_CHANGE') {
            if (respTypeIds.length === 0) return;
            payload = {
                direction_type_id: addingDirectionId,
                dept_changes: respTypeIds.map((typeId) => ({ department_type_id: typeId })),
            };
        } else {
            const value = addingCode === 'MAIN_DEPT_CHANGE' ? mainDeptId : newValue;
            const mapping = DIRECTION_CODE_TO_FIELDS[addingCode];
            if (value == null || value === '' || !mapping) return;
            payload = { direction_type_id: addingDirectionId, [mapping.new_]: value };
        }
        addChangeMutation.mutate(payload, { onSuccess: resetAddForm });
    };

    const addDisabled =
        addingDirectionId === '' ||
        addChangeMutation.isPending ||
        (addingCode === 'RESPONSIBILITY_DEPTS_CHANGE'
            ? respTypeIds.length === 0
            : addingCode === 'MAIN_DEPT_CHANGE'
                ? mainDeptId == null
                : newValue === '');

    // ── Can we apply? All required directions must be filled ──────────────────
    const requiredMissing = typeDirections.filter(
        (td) => td.is_required && !existingDirectionTypeIds.has(td.direction_type_id),
    );
    const canApply = isReady && !applyMutation.isPending;

    return (
        <Drawer anchor="right" open={open} onClose={onClose} PaperProps={{ sx: { width: { xs: '100%', sm: 640 } } }}>
            <Box sx={{ p: 3 }}>
                {/* Header */}
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6" fontWeight={600} sx={{ flex: 1 }}>
                        {event?.event_type?.code
                            ? eventTypeLabel(getString, event.event_type.code)
                            : cfl(getString('eventDetails') || 'Event details')}
                    </Typography>
                    {statusName && (
                        <Chip
                            label={cfl(getString(statusName) || statusName)}
                            color={isDraft ? 'warning' : isReady ? 'info' : 'success'}
                            size="small"
                            variant="outlined"
                            sx={{ mr: 1 }}
                        />
                    )}
                    <IconButton onClick={onClose} size="small">
                        <CloseIcon />
                    </IconButton>
                </Box>

                {/* Meta info — the effective date stays editable until applied */}
                {event && (
                    <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap', alignItems: 'center' }}>
                        {isEditable ? (
                            <LocalizationProvider dateAdapter={AdapterDayjs}>
                                <DatePicker
                                    label={cfl(getString('effectiveDate') || 'Effective date')}
                                    format={DATE_FORMAT}
                                    value={effectiveDate ? dayjs(effectiveDate) : null}
                                    onChange={(v) => {
                                        const d = v ? dayjs(v) : null;
                                        if (!d || !d.isValid()) return;
                                        const iso = d.format('YYYY-MM-DD');
                                        if (iso !== effectiveDate && !otherEventDates.includes(iso)) {
                                            dateMutation.mutate(iso);
                                        }
                                    }}
                                    shouldDisableDate={(d) => otherEventDates.includes(dayjs(d).format('YYYY-MM-DD'))}
                                    slotProps={{ textField: { size: 'small', sx: { width: 200 } } }}
                                />
                                {dateMutation.isPending && <CircularProgress size={20} />}
                            </LocalizationProvider>
                        ) : (
                            <Typography variant="body2" color="text.secondary">
                                {cfl(getString('effectiveDate') || 'Effective date')}:{' '}
                                <strong>{dayjs(effectiveDate).format(DATE_FORMAT)}</strong>
                            </Typography>
                        )}
                        {event.description && (
                            <Typography variant="body2" color="text.secondary">
                                {event.description}
                            </Typography>
                        )}
                    </Box>
                )}

                <Divider sx={{ mb: 2 }} />

                {/* Existing changes */}
                <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
                    {cfl(getString('changes') || 'Changes')}
                </Typography>

                {eventLoading ? (
                    <CircularProgress size={24} />
                ) : (fullEvent?.changes ?? []).length === 0 ? (
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        {cfl(getString('noChangesYet') || 'No changes added yet')}
                    </Typography>
                ) : (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mb: 2 }}>
                        {(fullEvent?.changes ?? []).map((change) => {
                            const code = change.direction_type?.code ?? '';
                            // STATUS_CHANGE is implied/auto-managed by the event
                            // type — it must never be deleted manually.
                            const isStatusChange = code === 'STATUS_CHANGE';
                            // Dependency rule: MAIN_DEPT_CHANGE cannot be removed
                            // while a JOB_CHANGE or RESPONSIBILITY_DEPTS_CHANGE
                            // (which depend on the department's type) still exist.
                            const hasDependents =
                                code === 'MAIN_DEPT_CHANGE' &&
                                (fullEvent?.changes ?? []).some((c) =>
                                    ['JOB_CHANGE', 'RESPONSIBILITY_DEPTS_CHANGE'].includes(
                                        c.direction_type?.code ?? '',
                                    ),
                                );
                            const showDelete = isEditable && !isStatusChange;
                            const canDelete = showDelete && !hasDependents;
                            return (
                                <Box
                                    key={change.id}
                                    sx={{
                                        p: 1.5,
                                        borderRadius: 1,
                                        bgcolor: 'action.hover',
                                        display: 'flex',
                                        alignItems: 'flex-start',
                                    }}
                                >
                                    <Box sx={{ flex: 1 }}>
                                        <Typography variant="body2" fontWeight={600} sx={{ mb: 0.5 }}>
                                            {directionTypeLabel(getString, code || null)}
                                        </Typography>
                                        {code === 'JOB_CHANGE' && (
                                            <Typography variant="body2">
                                                {change.prev_job?.name ?? '—'} → <strong>{change.new_job?.name ?? '—'}</strong>
                                            </Typography>
                                        )}
                                        {code === 'STATUS_CHANGE' && (
                                            <Typography variant="body2">
                                                {employeeStatusLabel(getString, change.prev_status?.name)} →{' '}
                                                <strong>{employeeStatusLabel(getString, change.new_status?.name)}</strong>
                                            </Typography>
                                        )}
                                        {code === 'MAIN_DEPT_CHANGE' && (
                                            <Typography variant="body2">
                                                {deptLabel(change.prev_department_id, change.prev_department?.name)} →{' '}
                                                <strong>{deptLabel(change.new_department_id, change.new_department?.name)}</strong>
                                            </Typography>
                                        )}
                                        {code === 'RESPONSIBILITY_DEPTS_CHANGE' && (
                                            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                                                {(change.dept_changes ?? []).map((dc) => (
                                                    <Chip
                                                        key={dc.id}
                                                        label={dc.department_type?.name ?? `#${dc.department_type_id}`}
                                                        size="small"
                                                        variant="outlined"
                                                    />
                                                ))}
                                            </Box>
                                        )}
                                    </Box>
                                    {showDelete && (
                                        <Tooltip
                                            title={
                                                hasDependents
                                                    ? cfl(getString('deleteJobFirst') || 'Remove the job/responsibility change first')
                                                    : cfl(getString('removeChange') || 'Remove change')
                                            }
                                        >
                                            <span>
                                                <IconButton
                                                    size="small"
                                                    color="error"
                                                    disabled={!canDelete || deleteChangeMutation.isPending}
                                                    onClick={() => deleteChangeMutation.mutate(change.id)}
                                                >
                                                    <DeleteIcon fontSize="small" />
                                                </IconButton>
                                            </span>
                                        </Tooltip>
                                    )}
                                </Box>
                            );
                        })}
                    </Box>
                )}

                <Divider sx={{ mb: 2 }} />

                {/* Add change section — editable while draft or ready */}
                {isEditable && missingDirections.length > 0 && (
                    <Box sx={{ mb: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                        <Typography variant="subtitle2" fontWeight={600}>
                            {cfl(getString('addChange') || 'Add change')}
                        </Typography>

                        {/* Direction picker */}
                        <FormControl fullWidth size="small">
                            <InputLabel>{cfl(getString('directionType') || 'Direction type')}</InputLabel>
                            <Select
                                variant="outlined"
                                value={addingDirectionId}
                                label={cfl(getString('directionType') || 'Direction type')}
                                onChange={(e) => {
                                    resetAddForm();
                                    setDirectionPick(e.target.value as number);
                                }}
                            >
                                {missingDirections.map((td) => (
                                    <MenuItem key={td.direction_type_id} value={td.direction_type_id}>
                                        {directionTypeLabel(getString, td.direction_type?.code)}
                                        {td.is_required && ' *'}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        {addingCode === 'MAIN_DEPT_CHANGE' && (
                            <MainDepartmentPicker
                                key={addingDirectionId}
                                value={mainDeptId}
                                onChange={setMainDeptId}
                                currentMainDeptIds={eventCode === 'ACTIVATION' ? [] : currentMainDeptIds}
                                getString={getString}
                            />
                        )}

                        {/* PROMOTION: show which department the new job stays within */}
                        {addingCode === 'JOB_CHANGE' && !eventTypeHasMainDept && currentMainDept && (
                            <Typography variant="caption" color="text.secondary">
                                {cfl(getString('promotionWithin') || 'Promotion within')}: {currentMainDept.name}
                            </Typography>
                        )}

                        {(addingCode === 'JOB_CHANGE' || addingCode === 'STATUS_CHANGE') && (
                            <FormControl fullWidth size="small">
                                <InputLabel>
                                    {cfl(getString(DIRECTION_CODE_TO_FIELDS[addingCode].label) || 'New value')}
                                </InputLabel>
                                <Select
                                    variant="outlined"
                                    value={addingCode === 'JOB_CHANGE' && jobsLoading ? '' : newValue}
                                    label={cfl(getString(DIRECTION_CODE_TO_FIELDS[addingCode].label) || 'New value')}
                                    onChange={(e) => setValuePick(e.target.value as number)}
                                    disabled={addingCode === 'JOB_CHANGE' && jobsLoading}
                                    endAdornment={
                                        addingCode === 'JOB_CHANGE' && jobsLoading
                                            ? <CircularProgress size={18} sx={{ mr: 3 }} />
                                            : undefined
                                    }
                                >
                                    {valueOptions.map((opt) => (
                                        <MenuItem key={opt.id} value={opt.id}>
                                            {opt.label}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        )}

                        {addingCode === 'RESPONSIBILITY_DEPTS_CHANGE' && (
                            <ResponsibilityTypesPicker
                                key={addingDirectionId}
                                employeeId={employeeId}
                                hasMainDepartment={currentMainDeptId != null}
                                value={respTypeIds}
                                onChange={setRespTypeIds}
                                getString={getString}
                            />
                        )}

                        <Box>
                            <Button
                                variant="outlined"
                                size="small"
                                startIcon={addChangeMutation.isPending ? <CircularProgress size={14} /> : <AddIcon />}
                                onClick={handleAddChange}
                                disabled={addDisabled}
                            >
                                {cfl(getString('addChange') || 'Add change')}
                            </Button>
                        </Box>
                    </Box>
                )}

                {/* Required directions not yet filled */}
                {isEditable && requiredMissing.length > 0 && (
                    <Alert severity="info" sx={{ mb: 2 }}>
                        {cfl(getString('requiredDirectionsMissing') || 'Required directions not filled')}:{' '}
                        {requiredMissing.map((td) => directionTypeLabel(getString, td.direction_type?.code)).join(', ')}
                    </Alert>
                )}

                {/* Apply button — shown once the event is ready */}
                {isReady && (
                    <Button
                        variant="contained"
                        color="success"
                        fullWidth
                        startIcon={
                            applyMutation.isPending ? (
                                <CircularProgress size={16} color="inherit" />
                            ) : (
                                <CheckCircleIcon />
                            )
                        }
                        onClick={() => applyMutation.mutate()}
                        disabled={!canApply}
                    >
                        {cfl(getString('applyEvent') || 'Apply event')}
                    </Button>
                )}
            </Box>
        </Drawer>
    );
}

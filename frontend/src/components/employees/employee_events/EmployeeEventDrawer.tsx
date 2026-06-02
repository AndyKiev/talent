// src/components/employees/employee_events/EmployeeEventDrawer.tsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Alert,
    Box,
    Button,
    Checkbox,
    Chip,
    CircularProgress,
    Divider,
    Drawer,
    FormControl,
    FormControlLabel,
    FormGroup,
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
import {
    fetchEmployeeEvent,
    fetchEmployeeEventTypeDirections,
    fetchEmployeeEventStatuses,
    fetchJobs,
    fetchEmployeeStatuses,
    fetchDepartments,
    fetchDepartmentsByCategory,
    fetchMainDepartmentCategories,
    fetchJobsByDepartmentType,
    fetchResponsibilityCategoriesForJob,
    fetchChangeDeptTypes,
    createEventChange,
    deleteEventChange,
    applyEmployeeEvent,
    type EmployeeEventFlat,
    type EmployeeEventFull,
    type EmployeeEventTypeDirectionNested,
    type EmployeeEventChangeCreate,
    type JobOption,
    type EmployeeStatusOption,
    type DepartmentOption,
    type ResponsibilityCategoryOption,
    type ChangeDeptTypeOption,
} from './employeeEventApi';
import { fetchEmployeeById } from '../employeeApi';
import { employeeEventsQK } from './useEmployeeEventMutations';
import type { GetStringFn } from '../../../types/getStringFn';
import cfl from '../../../utils/helpers.ts';
import { formatToUkrDate } from '../../../utils/dateFormatter';

interface Props {
    event: EmployeeEventFlat | null;
    employeeId: number;
    onClose: () => void;
    getString: GetStringFn;
}

const DIRECTION_CODE_TO_FIELDS: Record<string, { prev: string; new_: string; label: string }> = {
    JOB_CHANGE: { prev: 'prev_job_id', new_: 'new_job_id', label: 'job' },
    STATUS_CHANGE: { prev: 'prev_status_id', new_: 'new_status_id', label: 'employeeStatus' },
    MAIN_DEPT_CHANGE: { prev: 'prev_department_id', new_: 'new_department_id', label: 'mainDepartment' },
};

export function EmployeeEventDrawer({ event, employeeId, onClose, getString }: Props) {
    const qc = useQueryClient();
    const open = !!event;

    const [snackMsg, setSnackMsg] = useState<{ text: string; severity: 'success' | 'error' } | null>(null);

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

    // ── Fetch allowed directions for this event type ──────────────────────────
    const { data: typeDirections = [] } = useQuery<EmployeeEventTypeDirectionNested[]>({
        queryKey: ['employee-event-type-directions', event?.event_type_id],
        queryFn: () => fetchEmployeeEventTypeDirections(event!.event_type_id),
        enabled: !!event,
    });

    // ── Lookups ───────────────────────────────────────────────────────────────
    const { data: jobs = [] } = useQuery<JobOption[]>({
        queryKey: ['jobs-lookup'],
        queryFn: fetchJobs,
        staleTime: 10 * 60 * 1000,
        enabled: open,
    });

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

    // Employee — needed as the fallback job source for responsibility categories.
    const { data: employee } = useQuery({
        queryKey: ['employee', employeeId],
        queryFn: () => fetchEmployeeById(employeeId),
        enabled: open,
        staleTime: 5 * 60 * 1000,
    });

    // Change-dept-type lookup (MAIN_DEPT / RESPONSIBILITY_DEPT)
    const { data: changeDeptTypes = [] } = useQuery<ChangeDeptTypeOption[]>({
        queryKey: ['change-dept-types'],
        queryFn: fetchChangeDeptTypes,
        staleTime: 30 * 60 * 1000,
        enabled: open,
    });
    const responsibilityDeptTypeId = changeDeptTypes.find(
        (t) => t.code === 'RESPONSIBILITY_DEPT',
    )?.id ?? null;

    // Job source for responsibility categories: the job assigned IN this event
    // (JOB_CHANGE.new_job_id) if present, otherwise the employee's current job.
    const jobChangeInEvent = (fullEvent?.changes ?? []).find(
        (c) => c.direction_type?.code === 'JOB_CHANGE',
    );
    const responsibilityJobId =
        jobChangeInEvent?.new_job_id ?? employee?.job_id ?? null;

    const { data: responsibilityCategories = [] } = useQuery<ResponsibilityCategoryOption[]>({
        queryKey: ['responsibility-categories', responsibilityJobId],
        queryFn: () => fetchResponsibilityCategoriesForJob(responsibilityJobId as number),
        enabled: open && responsibilityJobId != null,
        staleTime: 5 * 60 * 1000,
    });

    // ── Add change mutation ───────────────────────────────────────────────────
    const addChangeMutation = useMutation({
        mutationFn: (payload: EmployeeEventChangeCreate) =>
            createEventChange(employeeId, event!.id, payload),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['employee-event-detail', employeeId, event?.id] });
            // Also refresh the events list so the draft -> ready status flip
            // shows in the grid without a manual page refresh.
            qc.invalidateQueries({ queryKey: employeeEventsQK(employeeId) });
            setSnackMsg({ text: cfl(getString('changeAdded') || 'Change added'), severity: 'success' });
        },
        onError: (err: unknown) => {
            const msg = (err as { response?: { data?: { detail?: string } } })
                ?.response?.data?.detail ?? 'Error adding change';
            setSnackMsg({ text: msg, severity: 'error' });
        },
    });

    // ── Apply event mutation ──────────────────────────────────────────────────
    const applyMutation = useMutation({
        mutationFn: () => {
            const appliedStatus = eventStatuses.find((s) => s.name === 'applied');
            if (!appliedStatus) throw new Error('Applied status not found');
            return applyEmployeeEvent(employeeId, event!.id, appliedStatus.id);
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: employeeEventsQK(employeeId) });
            qc.invalidateQueries({ queryKey: ['employee-event-detail', employeeId, event?.id] });
            // Applying writes status/job/department to the employee — refresh
            // the employees grid so the projection shows immediately.
            qc.invalidateQueries({ queryKey: ['employees'] });
            setSnackMsg({ text: cfl(getString('eventApplied') || 'Event applied'), severity: 'success' });
        },
        onError: (err: unknown) => {
            const msg = (err as { response?: { data?: { detail?: string } } })
                ?.response?.data?.detail ?? 'Error applying event';
            setSnackMsg({ text: msg, severity: 'error' });
        },
    });

    // ── Delete change mutation ────────────────────────────────────────────────
    const deleteChangeMutation = useMutation({
        mutationFn: (changeId: number) =>
            deleteEventChange(employeeId, event!.id, changeId),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['employee-event-detail', employeeId, event?.id] });
            qc.invalidateQueries({ queryKey: employeeEventsQK(employeeId) });
            setSnackMsg({ text: cfl(getString('changeRemoved') || 'Change removed'), severity: 'success' });
        },
        onError: (err: unknown) => {
            const msg = (err as { response?: { data?: { detail?: string } } })
                ?.response?.data?.detail ?? 'Error removing change';
            setSnackMsg({ text: msg, severity: 'error' });
        },
    });

    // ── Derive the saved main department + its type (drives job filtering) ─────
    const savedMainDeptChange = (fullEvent?.changes ?? []).find(
        (c) => c.direction_type?.code === 'MAIN_DEPT_CHANGE',
    );
    const savedMainDeptId = savedMainDeptChange?.new_department_id ?? null;
    const savedMainDept = departments.find((d) => d.id === savedMainDeptId);
    const savedMainDeptTypeId = savedMainDept?.department_type_id ?? null;

    // Jobs valid for the saved main department's TYPE (not all jobs).
    const { data: jobsByType = [] } = useQuery({
        queryKey: ['jobs-by-dept-type', savedMainDeptTypeId],
        queryFn: () => fetchJobsByDepartmentType(savedMainDeptTypeId as number),
        enabled: open && savedMainDeptTypeId != null,
        staleTime: 5 * 60 * 1000,
    });

    // ── Which directions are already filled ───────────────────────────────────
    const existingDirectionTypeIds = new Set(
        (fullEvent?.changes ?? []).map((c) => c.direction_type_id),
    );

    // Event type code (drives status auto-set / picker rules)
    const eventCode = event?.event_type?.code ?? '';
    // For these types the status is fixed by the backend (auto-created),
    // so the HRM must never pick STATUS_CHANGE manually.
    const STATUS_AUTO_CODES = ['ACTIVATION', 'RETURN', 'DISMISSAL'];
    // For temporary leave, only these status names are legal targets.
    const TEMPORARY_LEAVE_STATUSES = ['maternity', 'coscription'];

    // Directions that still need to be filled.
    // - STATUS_CHANGE hidden from the picker for auto-status event types.
    // - JOB_CHANGE hidden until a MAIN_DEPT_CHANGE row is saved (job list
    //   depends on the chosen department's type).
    const missingDirections = typeDirections.filter((td) => {
        if (existingDirectionTypeIds.has(td.direction_type_id)) return false;
        const code = td.direction_type?.code ?? '';
        if (code === 'STATUS_CHANGE' && STATUS_AUTO_CODES.includes(eventCode)) {
            return false;
        }
        // Require main department to be saved before offering job change,
        // unless the event has no MAIN_DEPT_CHANGE direction at all (then a
        // standalone job change like PROMOTION is fine and uses all jobs).
        const typeHasMainDept = typeDirections.some(
            (d) => d.direction_type?.code === 'MAIN_DEPT_CHANGE',
        );
        if (code === 'JOB_CHANGE' && typeHasMainDept && savedMainDeptId == null) {
            return false;
        }
        return true;
    });

    // ── Current employee state (for exclusions in TRANSFER / PROMOTION) ───────
    const currentJobId = employee?.job_id ?? null;
    const currentMainDeptIds = (employee?.main_departments ?? []).map(
        (d) => d.department_id,
    );
    // For PROMOTION (no MAIN_DEPT_CHANGE), jobs are scoped to the current main
    // department's type. We need that type id.
    const currentMainDept = departments.find((d) =>
        currentMainDeptIds.includes(d.id),
    );
    const currentMainDeptTypeId = currentMainDept?.department_type_id ?? null;

    // Jobs scoped to the CURRENT main dept type (used by PROMOTION).
    const { data: jobsByCurrentType = [] } = useQuery({
        queryKey: ['jobs-by-dept-type', currentMainDeptTypeId],
        queryFn: () => fetchJobsByDepartmentType(currentMainDeptTypeId as number),
        enabled: open && currentMainDeptTypeId != null && eventCode === 'PROMOTION',
        staleTime: 5 * 60 * 1000,
    });

    // ── Get options for a direction code ──────────────────────────────────────
    const getOptions = (code: string): { id: number; name: string }[] => {
        switch (code) {
            case 'JOB_CHANGE': {
                // PROMOTION: jobs scoped to current main dept type.
                // TRANSFER/others: jobs scoped to the newly-saved dept type.
                let list =
                    eventCode === 'PROMOTION'
                        ? jobsByCurrentType
                        : savedMainDeptTypeId != null
                            ? jobsByType
                            : jobs;
                // Exclude the employee's current job (we're changing it).
                if (currentJobId != null) {
                    list = list.filter((j) => j.id !== currentJobId);
                }
                return list;
            }
            case 'STATUS_CHANGE':
                if (eventCode === 'TEMPORARY_LEAVE') {
                    return employeeStatuses.filter((s) =>
                        TEMPORARY_LEAVE_STATUSES.includes(s.name),
                    );
                }
                return employeeStatuses;
            case 'MAIN_DEPT_CHANGE':
                // Exclude the employee's current main department(s) on transfer.
                return departments.filter(
                    (d) => !currentMainDeptIds.includes(d.id),
                );
            default: return [];
        }
    };

    // ── Add change form state (one direction at a time) ───────────────────────
    const [addingDirectionId, setAddingDirectionId] = useState<number | null>(null);
    const [newValue, setNewValue] = useState<number | ''>('');
    // For MAIN_DEPT_CHANGE: pick a main category first, then a department in it.
    const [selectedCategoryId, setSelectedCategoryId] = useState<number | ''>('');

    const addingDirection = typeDirections.find((td) => td.direction_type_id === addingDirectionId);
    const addingCode = addingDirection?.direction_type?.code ?? '';

    // Main department categories (is_main=true) — for the dept cascade.
    const { data: mainCategories = [] } = useQuery({
        queryKey: ['main-department-categories'],
        queryFn: fetchMainDepartmentCategories,
        enabled: open && addingCode === 'MAIN_DEPT_CHANGE',
        staleTime: 10 * 60 * 1000,
    });

    // Departments within the chosen category (shortlist).
    const { data: deptsByCategory = [] } = useQuery({
        queryKey: ['departments-by-category', selectedCategoryId],
        queryFn: () => fetchDepartmentsByCategory(selectedCategoryId as number),
        enabled: open && addingCode === 'MAIN_DEPT_CHANGE' && selectedCategoryId !== '',
        staleTime: 5 * 60 * 1000,
    });

    // ── RESPONSIBILITY_DEPTS_CHANGE state ─────────────────────────────────────
    // Pick a responsibility category (job-driven, with is_main=false fallback),
    // then multi-select departments within it.
    const [respCategoryId, setRespCategoryId] = useState<number | ''>('');
    const [respDeptIds, setRespDeptIds] = useState<number[]>([]);

    const { data: respDeptsByCategory = [] } = useQuery({
        queryKey: ['resp-departments-by-category', respCategoryId],
        queryFn: () => fetchDepartmentsByCategory(respCategoryId as number),
        enabled:
            open &&
            addingCode === 'RESPONSIBILITY_DEPTS_CHANGE' &&
            respCategoryId !== '',
        staleTime: 5 * 60 * 1000,
    });

    const handleAddChange = () => {
        if (!addingDirectionId || !addingCode) return;

        // RESPONSIBILITY_DEPTS_CHANGE: build dept_changes from the multi-select.
        if (addingCode === 'RESPONSIBILITY_DEPTS_CHANGE') {
            if (respDeptIds.length === 0 || responsibilityDeptTypeId == null) return;
            const payload: EmployeeEventChangeCreate = {
                direction_type_id: addingDirectionId,
                dept_changes: respDeptIds.map((deptId) => ({
                    department_id: deptId,
                    change_dept_type_id: responsibilityDeptTypeId,
                })),
            };
            addChangeMutation.mutate(payload, {
                onSuccess: () => {
                    setAddingDirectionId(null);
                    setRespCategoryId('');
                    setRespDeptIds([]);
                },
            });
            return;
        }

        // Single-value directions (job / status / main dept)
        if (!newValue) return;
        const mapping = DIRECTION_CODE_TO_FIELDS[addingCode];
        if (!mapping) return;

        const payload: EmployeeEventChangeCreate = {
            direction_type_id: addingDirectionId,
            [mapping.new_]: newValue as number,
        };

        addChangeMutation.mutate(payload, {
            onSuccess: () => {
                setAddingDirectionId(null);
                setNewValue('');
                setSelectedCategoryId('');
            },
        });
    };

    // ── Can we apply? All required directions must be filled ──────────────────
    const requiredMissing = typeDirections.filter(
        (td) => td.is_required && !existingDirectionTypeIds.has(td.direction_type_id),
    );
    const canApply = isReady && !applyMutation.isPending;

    return (
        <Drawer anchor="right" open={open} onClose={onClose} PaperProps={{ sx: { width: { xs: '100%', sm: 480 } } }}>
            <Box sx={{ p: 3 }}>
                {/* Header */}
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6" fontWeight={600} sx={{ flex: 1 }}>
                        {event?.event_type?.name ?? cfl(getString('eventDetails') || 'Event details')}
                    </Typography>
                    {statusName && (
                        <Chip
                            label={cfl(getString(statusName) || statusName)}
                            color={
                                statusName === 'draft'
                                    ? 'warning'
                                    : statusName === 'ready'
                                        ? 'info'
                                        : 'success'
                            }
                            size="small"
                            variant="outlined"
                            sx={{ mr: 1 }}
                        />
                    )}
                    <IconButton onClick={onClose} size="small">
                        <CloseIcon />
                    </IconButton>
                </Box>

                {/* Meta info */}
                {event && (
                    <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
                        <Typography variant="body2" color="text.secondary">
                            {cfl(getString('effectiveDate') || 'Effective date')}:{' '}
                            <strong>{formatToUkrDate(event.effective_date)}</strong>
                        </Typography>
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
                                            {change.direction_type?.name ?? `Direction #${change.direction_type_id}`}
                                        </Typography>
                                        {code === 'JOB_CHANGE' && (
                                            <Typography variant="body2">
                                                {change.prev_job?.name ?? '—'} → <strong>{change.new_job?.name ?? '—'}</strong>
                                            </Typography>
                                        )}
                                        {code === 'STATUS_CHANGE' && (
                                            <Typography variant="body2">
                                                {change.prev_status?.name ?? '—'} → <strong>{change.new_status?.name ?? '—'}</strong>
                                            </Typography>
                                        )}
                                        {code === 'MAIN_DEPT_CHANGE' && (
                                            <Typography variant="body2">
                                                {change.prev_department?.name ?? '—'} → <strong>{change.new_department?.name ?? '—'}</strong>
                                            </Typography>
                                        )}
                                        {code === 'RESPONSIBILITY_DEPTS_CHANGE' && (
                                            <Box>
                                                <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                                                    {cfl(getString('responsibilityDepts') || 'Responsibility departments')}
                                                </Typography>
                                                <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                                                    {(change.dept_changes ?? []).map((dc) => (
                                                        <Chip
                                                            key={dc.id}
                                                            label={dc.department?.name ?? `#${dc.department_id}`}
                                                            size="small"
                                                            variant="outlined"
                                                        />
                                                    ))}
                                                </Box>
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
                    <Box sx={{ mb: 2 }}>
                        <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
                            {cfl(getString('addChange') || 'Add change')}
                        </Typography>

                        {/* Direction picker */}
                        <FormControl fullWidth size="small" sx={{ mb: 1.5 }}>
                            <InputLabel>{cfl(getString('directionType') || 'Direction type')}</InputLabel>
                            <Select
                                variant="outlined"
                                value={addingDirectionId ?? ''}
                                label={cfl(getString('directionType') || 'Direction type')}
                                onChange={(e) => {
                                    setAddingDirectionId(e.target.value as number);
                                    setNewValue('');
                                    setSelectedCategoryId('');
                                }}
                            >
                                {missingDirections.map((td) => (
                                    <MenuItem key={td.direction_type_id} value={td.direction_type_id}>
                                        {td.direction_type?.name ?? `#${td.direction_type_id}`}
                                        {td.is_required && ' *'}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        {/* MAIN_DEPT_CHANGE: category → department cascade */}
                        {addingCode === 'MAIN_DEPT_CHANGE' && (
                            <>
                                <FormControl fullWidth size="small" sx={{ mb: 1.5 }}>
                                    <InputLabel>
                                        {cfl(getString('departmentCategory') || 'Department category')}
                                    </InputLabel>
                                    <Select
                                        variant="outlined"
                                        value={selectedCategoryId}
                                        label={cfl(getString('departmentCategory') || 'Department category')}
                                        onChange={(e) => {
                                            setSelectedCategoryId(e.target.value as number);
                                            setNewValue('');
                                        }}
                                    >
                                        {mainCategories.map((cat) => (
                                            <MenuItem key={cat.id} value={cat.id}>
                                                {cat.name}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>

                                {selectedCategoryId !== '' && (
                                    <FormControl fullWidth size="small" sx={{ mb: 1.5 }}>
                                        <InputLabel>
                                            {cfl(getString('mainDepartment') || 'Main department')}
                                        </InputLabel>
                                        <Select
                                            variant="outlined"
                                            value={newValue}
                                            label={cfl(getString('mainDepartment') || 'Main department')}
                                            onChange={(e) => setNewValue(e.target.value as number)}
                                        >
                                            {deptsByCategory
                                                .filter((d) => !currentMainDeptIds.includes(d.id))
                                                .map((d) => (
                                                    <MenuItem key={d.id} value={d.id}>
                                                        {d.name}
                                                    </MenuItem>
                                                ))}
                                        </Select>
                                    </FormControl>
                                )}
                            </>
                        )}

                        {/* Other directions (JOB_CHANGE, STATUS_CHANGE): single select */}
                        {addingCode &&
                            addingCode !== 'RESPONSIBILITY_DEPTS_CHANGE' &&
                            addingCode !== 'MAIN_DEPT_CHANGE' && (
                                <FormControl fullWidth size="small" sx={{ mb: 1.5 }}>
                                    <InputLabel>
                                        {cfl(getString(DIRECTION_CODE_TO_FIELDS[addingCode]?.label ?? 'newValue') || 'New value')}
                                    </InputLabel>
                                    <Select
                                        variant="outlined"
                                        value={newValue}
                                        label={cfl(getString(DIRECTION_CODE_TO_FIELDS[addingCode]?.label ?? 'newValue') || 'New value')}
                                        onChange={(e) => setNewValue(e.target.value as number)}
                                    >
                                        {getOptions(addingCode).map((opt) => (
                                            <MenuItem key={opt.id} value={opt.id}>
                                                {opt.name}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            )}

                        {addingCode === 'RESPONSIBILITY_DEPTS_CHANGE' && (
                            <>
                                {responsibilityJobId == null ? (
                                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                        {cfl(getString('responsibilityNeedsJob') ||
                                            'Assign a job first to choose responsibility departments')}
                                    </Typography>
                                ) : (
                                    <>
                                        <FormControl fullWidth size="small" sx={{ mb: 1.5 }}>
                                            <InputLabel>
                                                {cfl(getString('departmentCategory') || 'Department category')}
                                            </InputLabel>
                                            <Select
                                                variant="outlined"
                                                value={respCategoryId}
                                                label={cfl(getString('departmentCategory') || 'Department category')}
                                                onChange={(e) => {
                                                    setRespCategoryId(e.target.value as number);
                                                    setRespDeptIds([]);
                                                }}
                                            >
                                                {responsibilityCategories.map((c) => (
                                                    <MenuItem key={c.id} value={c.id}>
                                                        {c.name}
                                                    </MenuItem>
                                                ))}
                                            </Select>
                                        </FormControl>

                                        {respCategoryId !== '' && (
                                            <Box sx={{ mb: 1.5 }}>
                                                <Typography variant="caption" color="text.secondary">
                                                    {cfl(getString('responsibilityDepts') || 'Responsibility departments')}
                                                </Typography>
                                                <FormGroup
                                                    sx={{
                                                        maxHeight: 220,
                                                        overflowY: 'auto',
                                                        border: '1px solid',
                                                        borderColor: 'divider',
                                                        borderRadius: 1,
                                                        px: 1,
                                                        mt: 0.5,
                                                    }}
                                                >
                                                    {respDeptsByCategory.map((d) => (
                                                        <FormControlLabel
                                                            key={d.id}
                                                            control={
                                                                <Checkbox
                                                                    size="small"
                                                                    checked={respDeptIds.includes(d.id)}
                                                                    onChange={(_, checked) =>
                                                                        setRespDeptIds((prev) =>
                                                                            checked
                                                                                ? [...prev, d.id]
                                                                                : prev.filter((id) => id !== d.id),
                                                                        )
                                                                    }
                                                                />
                                                            }
                                                            label={d.name}
                                                        />
                                                    ))}
                                                </FormGroup>
                                                {respDeptIds.length > 0 && (
                                                    <Typography variant="caption" color="primary" sx={{ mt: 0.5, display: 'block' }}>
                                                        {respDeptIds.length} {getString('selected') || 'selected'}
                                                    </Typography>
                                                )}
                                            </Box>
                                        )}
                                    </>
                                )}
                            </>
                        )}

                        <Button
                            variant="outlined"
                            size="small"
                            startIcon={addChangeMutation.isPending ? <CircularProgress size={14} /> : <AddIcon />}
                            onClick={handleAddChange}
                            disabled={
                                !addingDirectionId ||
                                addChangeMutation.isPending ||
                                (addingCode === 'RESPONSIBILITY_DEPTS_CHANGE'
                                    ? respDeptIds.length === 0
                                    : !newValue)
                            }
                        >
                            {cfl(getString('addChange') || 'Add change')}
                        </Button>
                    </Box>
                )}

                {/* Required directions not yet filled */}
                {isEditable && requiredMissing.length > 0 && (
                    <Alert severity="info" sx={{ mb: 2 }}>
                        {cfl(getString('requiredDirectionsMissing') || 'Required directions not filled')}:{' '}
                        {requiredMissing.map((td) => td.direction_type?.name ?? `#${td.direction_type_id}`).join(', ')}
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

                {/* Snack message */}
                {snackMsg && (
                    <Alert
                        severity={snackMsg.severity}
                        sx={{ mt: 2 }}
                        onClose={() => setSnackMsg(null)}
                    >
                        {snackMsg.text}
                    </Alert>
                )}
            </Box>
        </Drawer>
    );
}
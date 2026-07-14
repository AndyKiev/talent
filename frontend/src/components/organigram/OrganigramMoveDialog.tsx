// src/components/organigram/OrganigramMoveDialog.tsx
//
// Confirmation modal for a drag-and-drop move in the organigram: shows the
// employee, the from → to job/department, the resulting event type
// (PROMOTION = same department, TRANSFER = department changes), and a wheel
// picker for the effective date (defaults to the 1st of the NEXT month).
// Confirming creates the employee event (draft header + JOB_CHANGE
// [+ MAIN_DEPT_CHANGE] rows in one POST).
//
// The move's target may be partial: dropping on a DEPARTMENT box leaves the
// job to be picked here; dropping on the transfer BAY leaves both the
// department (scope select + subtree picker) and the job to be picked here.
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
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import dayjs from 'dayjs';
import OrganigramDateWheelPicker from './OrganigramDateWheelPicker';
import { OrganigramScopeSelect } from './OrganigramScopeSelect';
import { OrganigramDeptTreePicker } from './OrganigramDeptTreePicker';
import {
    createOrganigramEvent,
    moveEventCode,
    type OrganigramEventChangeCreate,
    type OrganigramMove,
} from './organigramApi';
import {
    fetchEmployeeEventStatuses,
    fetchEmployeeEventTypes,
    fetchJobsByDepartmentType,
    type EmployeeEventStatusSchema,
    type EmployeeEventType,
} from '../employees/employee_events/employeeEventApi';
import { formatDate } from '../../utils/date';
import type { GetStringFn } from '../../types/getStringFn';
import cfl from '../../utils/helpers.ts';

interface Props {
    move: OrganigramMove | null;
    getString: GetStringFn;
    onClose: () => void;
    setSnackbar: (s: { open: boolean; message: string; severity: 'success' | 'error' }) => void;
}

// The dialog-resolved target department (drop-provided or picked here).
interface TargetDept {
    id: number;
    name: string;
    typeId: number | null;
}

export function OrganigramMoveDialog({ move, getString, onClose, setSnackbar }: Props) {
    const qc = useQueryClient();
    const open = move != null;

    // The parent remounts this dialog per move (key prop), so initial values
    // are fresh each time it opens. Planning default: 1st of the next month.
    const [effectiveDate, setEffectiveDate] = useState<string>(() =>
        dayjs().add(1, 'month').startOf('month').format('YYYY-MM-DD'),
    );
    const [targetDept, setTargetDept] = useState<TargetDept | null>(() =>
        move && move.toDeptId != null
            ? { id: move.toDeptId, name: move.toDeptName ?? '', typeId: move.toDeptTypeId }
            : null,
    );
    const [targetJob, setTargetJob] = useState<{ id: number; name: string } | null>(() =>
        move && move.toJobId != null
            ? { id: move.toJobId, name: move.toJobName ?? '' }
            : null,
    );
    // Bay drops pick the department here: top scope instance, then subtree.
    const needsDeptPick = move != null && move.toDeptId == null;
    const needsJobPick = move != null && move.toJobId == null;
    const [topId, setTopId] = useState<number | null>(null);

    const { data: eventTypes = [] } = useQuery<EmployeeEventType[]>({
        queryKey: ['employee-event-types'],
        queryFn: fetchEmployeeEventTypes,
        staleTime: 10 * 60 * 1000,
        enabled: open,
    });
    const { data: statuses = [] } = useQuery<EmployeeEventStatusSchema[]>({
        queryKey: ['employee-event-statuses'],
        queryFn: fetchEmployeeEventStatuses,
        staleTime: 10 * 60 * 1000,
        enabled: open,
    });

    // Jobs valid for the target department's TYPE (active links only).
    const { data: jobOptions = [] } = useQuery({
        queryKey: ['jobs-by-dept-type', targetDept?.typeId],
        queryFn: () => fetchJobsByDepartmentType(targetDept!.typeId!),
        enabled: open && needsJobPick && targetDept?.typeId != null,
        staleTime: 5 * 60 * 1000,
    });

    const resolved: OrganigramMove | null =
        move && targetDept
            ? {
                  ...move,
                  toDeptId: targetDept.id,
                  toDeptName: targetDept.name,
                  toDeptTypeId: targetDept.typeId,
                  toJobId: targetJob?.id ?? null,
                  toJobName: targetJob?.name ?? null,
              }
            : move;

    const code = resolved ? moveEventCode(resolved) : 'TRANSFER';
    const eventType = eventTypes.find((t) => t.code === code);
    const draftStatus = statuses.find((s) => s.name === 'draft');
    const directionId = (dirCode: string): number | null =>
        eventType?.type_directions?.find((d) => d.direction_type?.code === dirCode)
            ?.direction_type_id ?? null;

    // Staying on the same job in the same department is a no-op, not an event.
    const sameJobSameDept =
        resolved != null &&
        resolved.toDeptId === resolved.fromDeptId &&
        resolved.toJobId === resolved.fromJobId;

    const ready =
        resolved != null &&
        resolved.toDeptId != null &&
        resolved.toJobId != null &&
        !sameJobSameDept &&
        eventType != null &&
        draftStatus != null;

    const createMutation = useMutation({
        mutationFn: () => {
            if (!ready || !resolved) return Promise.reject(new Error('not ready'));
            const jobDirId = directionId('JOB_CHANGE');
            if (jobDirId == null) return Promise.reject(new Error('JOB_CHANGE direction missing'));
            const changes: OrganigramEventChangeCreate[] = [
                { direction_type_id: jobDirId, new_job_id: resolved.toJobId },
            ];
            if (code === 'TRANSFER') {
                const deptDirId = directionId('MAIN_DEPT_CHANGE');
                if (deptDirId == null) {
                    return Promise.reject(new Error('MAIN_DEPT_CHANGE direction missing'));
                }
                changes.push({
                    direction_type_id: deptDirId,
                    new_department_id: resolved.toDeptId,
                });
            }
            return createOrganigramEvent(resolved.employeeId, {
                event_type_id: eventType!.id,
                status_id: draftStatus!.id,
                effective_date: effectiveDate,
                changes,
            });
        },
        onSuccess: (res) => {
            // The move may already surface in the as-of views (as pending).
            qc.invalidateQueries({ queryKey: ['headcount_organigram'] });
            qc.invalidateQueries({ queryKey: ['headcount_calc'] });
            qc.invalidateQueries({ queryKey: ['headcount_fact_employees'] });
            if (move) qc.invalidateQueries({ queryKey: ['employee-events', move.employeeId] });
            setSnackbar({
                open: true,
                // Prefer the backend's translated success detail.
                message:
                    res.detail ||
                    getString('organigramEventCreated', {
                        type: eventType?.name ?? code,
                        name: move?.employeeName ?? '',
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

    if (!move) return null;
    const thisYear = dayjs().year();

    return (
        <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
            <DialogTitle>{cfl(getString('organigramMoveTitle'))}</DialogTitle>
            <DialogContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <Typography variant="subtitle2" fontWeight={700} sx={{ flex: 1 }}>
                        {move.employeeName}
                    </Typography>
                    <Chip
                        label={eventType?.name ?? code}
                        size="small"
                        color={code === 'PROMOTION' ? 'success' : 'info'}
                        variant="outlined"
                    />
                </Box>

                <Box sx={{ mb: 1.5 }}>
                    <Typography variant="body2" color="text.secondary">
                        {move.fromJobName} — {move.fromDeptName}
                    </Typography>
                    <ArrowDownwardIcon
                        sx={{ fontSize: 16, my: 0.25, color: 'text.secondary' }}
                    />
                    <Typography variant="body2" fontWeight={600}>
                        {targetJob?.name ?? '?'} — {targetDept?.name ?? '?'}
                    </Typography>
                </Box>

                {/* ── Bay drop: pick the destination department ────────────── */}
                {needsDeptPick && (
                    <Box sx={{ mb: 1.5 }}>
                        <OrganigramScopeSelect
                            value={topId}
                            onChange={(id) => {
                                setTopId(id);
                                setTargetDept(null);
                                setTargetJob(null);
                            }}
                        />
                        {topId != null && (
                            <Box sx={{ mt: 1 }}>
                                <OrganigramDeptTreePicker
                                    rootId={topId}
                                    selectedId={targetDept?.id ?? null}
                                    onSelect={(node) => {
                                        setTargetDept({
                                            id: node.id,
                                            name: node.name,
                                            typeId: node.department_type_id,
                                        });
                                        setTargetJob(null);
                                    }}
                                />
                            </Box>
                        )}
                    </Box>
                )}

                {/* ── Dept-box / bay drop: pick the job in that department ── */}
                {needsJobPick && (
                    <FormControl fullWidth size="small" sx={{ mb: 1.5 }} disabled={targetDept == null}>
                        <InputLabel>{cfl(getString('job'))}</InputLabel>
                        <Select
                            variant="outlined"
                            label={cfl(getString('job'))}
                            value={targetJob?.id ?? ''}
                            onChange={(e) => {
                                const job = jobOptions.find((j) => j.id === e.target.value);
                                setTargetJob(job ? { id: job.id, name: job.name } : null);
                            }}
                        >
                            {jobOptions
                                .filter(
                                    (j) =>
                                        !(
                                            targetDept?.id === move.fromDeptId &&
                                            j.id === move.fromJobId
                                        ),
                                )
                                .map((j) => (
                                    <MenuItem key={j.id} value={j.id}>
                                        {j.name}
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
                    onClick={() => createMutation.mutate()}
                    disabled={createMutation.isPending || !ready}
                >
                    {getString('confirm')}
                </Button>
            </DialogActions>
        </Dialog>
    );
}

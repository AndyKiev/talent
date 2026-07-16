import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from '@tanstack/react-router';
import type { UseMutationResult } from '@tanstack/react-query';
import {
    Alert,
    Autocomplete,
    Box,
    Breadcrumbs,
    Button,
    Chip,
    CircularProgress,
    MenuItem,
    Paper,
    Snackbar,
    Stack,
    Tab,
    Tabs,
    TextField,
    Typography,
} from '@mui/material';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from 'dayjs';
import useString from '../../../hooks/useString';
import cfl from '../../../utils/helpers.ts';
import { DATE_FORMAT } from '../../../utils/eNums.ts';
import { formatToUkrDate } from '../../../utils/dateFormatter';
import type { GetStringFn } from '../../../types/getStringFn';
import { RECRUITMENT_TASK_QK, JOB_REQUIREMENT_GROUPS_QK, DEPARTMENT_FLAT_QK } from '../../../utils/queryKeys';
import { fetchDepartmentsFlat } from '../../admin/departments/departmentApi';
import {
    fetchRecruitmentTask,
    fetchRecruitmentTaskStatuses,
    type MutationResponse,
    type RecruitmentStatusKey,
    type RecruitmentTask,
    type RecruitmentTaskUpdate,
} from './recruitmentTaskApi';
import { fetchJobRequirementGroups, type JobRequirementGroup } from '../requirements/jobRequirementApi';
import { useRecruitmentTaskMutations } from './useRecruitmentTaskMutations';
import { JobRequirementGroupsManager } from '../requirements/JobRequirementGroupsManager';
import { RecruitmentTaskBoard } from './RecruitmentTaskBoard';
import { NEXT_STATUSES, STATUS_COLOR, statusLabel, transitionColor, transitionLabel } from './recruitmentStatus';

const fmt = (v: string | null): string => (v ? formatToUkrDate(v) : '—');

type UpdateMutation = UseMutationResult<MutationResponse<RecruitmentTask>, Error, { id: number; data: RecruitmentTaskUpdate }>;
type StatusMutation = UseMutationResult<MutationResponse<RecruitmentTask>, Error, { id: number; statusKey: RecruitmentStatusKey }>;

// ── Header: job, status chip, transition buttons, timestamps (always visible) ──
function TaskHeaderCard({
    task,
    getString,
    statusMutation,
}: {
    task: RecruitmentTask;
    getString: GetStringFn;
    statusMutation: StatusMutation;
}) {
    const statusKey = task.status?.name;
    const nexts = statusKey ? NEXT_STATUSES[statusKey] : [];
    return (
        <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', p: 2 }}>
            <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 1.5 }} flexWrap="wrap" useFlexGap>
                <Typography variant="h6" sx={{ flex: 1 }}>
                    {task.job?.name ?? task.job_id}
                </Typography>
                <Chip
                    variant="outlined"
                    label={`${getString('openings') || 'Openings'}: ${task.openings}`}
                />
                {statusKey && <Chip label={statusLabel(statusKey, getString)} color={STATUS_COLOR[statusKey]} />}
                {nexts.map((target) => (
                    <Button
                        key={target}
                        size="small"
                        variant="outlined"
                        color={transitionColor(target)}
                        onClick={() => statusMutation.mutate({ id: task.id, statusKey: target })}
                        disabled={statusMutation.isPending}
                    >
                        {transitionLabel(target, getString)}
                    </Button>
                ))}
            </Stack>
            <Stack direction="row" spacing={4} flexWrap="wrap" useFlexGap>
                <Typography variant="body2" color="text.secondary">
                    {getString('createdAt') || 'Created at'}: {fmt(task.created_at)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    {getString('inProcessAt') || 'In process since'}: {fmt(task.in_process_at)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    {getString('closedAt') || 'Closed at'}: {fmt(task.closed_at)}
                </Typography>
                {task.top_org_unit && (
                    <Typography variant="body2" color="text.secondary">
                        {getString('topOrgUnit') || 'Top unit'}: {task.top_org_unit.name}
                    </Typography>
                )}
            </Stack>
        </Paper>
    );
}

// ── Details tab: the editable main fields. Keyed by task.id so useState
//    initializers prefill without a setState-in-effect. ─────────────────────────
function TaskDetailsForm({
    task,
    groups,
    getString,
    updateMutation,
}: {
    task: RecruitmentTask;
    groups: JobRequirementGroup[];
    getString: GetStringFn;
    updateMutation: UpdateMutation;
}) {
    const [comment, setComment] = useState(task.comment ?? '');
    const [deadline, setDeadline] = useState(task.target_deadline ?? '');
    const [groupId, setGroupId] = useState<number | ''>(task.requirement_group_id ?? '');
    const [departmentId, setDepartmentId] = useState<number | null>(task.department_id);
    const [openings, setOpenings] = useState(task.openings ?? 1);

    const { data: departments = [] } = useQuery({
        queryKey: DEPARTMENT_FLAT_QK,
        queryFn: fetchDepartmentsFlat,
    });
    const selectedDept = departments.find((d) => d.id === departmentId) ?? null;

    const statusKey = task.status?.name;
    const closed = statusKey === 'fulfilled' || statusKey === 'rejected';

    const handleSave = () => {
        updateMutation.mutate({
            id: task.id,
            data: {
                comment: comment.trim() || null,
                target_deadline: deadline || null,
                requirement_group_id: groupId === '' ? null : groupId,
                department_id: departmentId,
                openings: Math.max(1, openings),
            },
        });
    };

    return (
        <Stack spacing={2} sx={{ maxWidth: 520 }}>
            {closed && (
                <Alert severity="info">
                    {getString('recruitmentTaskClosedHint') || 'Task is closed — reopen it to edit these fields.'}
                </Alert>
            )}
            <TextField
                select
                variant="outlined"
                label={getString('requirementGroup') || 'Requirement group'}
                value={groupId}
                onChange={(e) => setGroupId(e.target.value === '' ? '' : Number(e.target.value))}
                fullWidth
                disabled={closed}
            >
                <MenuItem value="">
                    <em>{getString('noRequirementGroup') || 'No requirement group'}</em>
                </MenuItem>
                {groups.map((g) => (
                    <MenuItem key={g.id} value={g.id}>
                        {g.name}
                        {g.is_active ? ` (${getString('activeRequirementGroup') || 'Active'})` : ''}
                    </MenuItem>
                ))}
            </TextField>
            <Autocomplete
                value={selectedDept}
                onChange={(_, v) => setDepartmentId(v?.id ?? null)}
                options={departments}
                getOptionLabel={(o) => o.name}
                isOptionEqualToValue={(a, b) => a.id === b.id}
                disabled={closed}
                renderInput={(params) => <TextField {...params} label={getString('department') || 'Department'} />}
            />
            <TextField
                label={getString('openings') || 'Openings (positions)'}
                type="number"
                value={openings}
                onChange={(e) => setOpenings(Math.max(1, Number(e.target.value) || 1))}
                fullWidth
                disabled={closed}
                slotProps={{ htmlInput: { min: 1 } }}
            />
            <TextField
                label={getString('comment') || 'Comment'}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                fullWidth
                multiline
                rows={3}
                disabled={closed}
            />
            <LocalizationProvider dateAdapter={AdapterDayjs}>
                <DatePicker
                    label={getString('targetDeadline') || 'Target deadline'}
                    format={DATE_FORMAT}
                    value={deadline ? dayjs(deadline) : null}
                    onChange={(d) => setDeadline(d ? dayjs(d).format('YYYY-MM-DD') : '')}
                    disabled={closed}
                    slotProps={{ textField: { fullWidth: true } }}
                />
            </LocalizationProvider>
            {!closed && (
                <Box>
                    <Button variant="contained" onClick={handleSave} disabled={updateMutation.isPending}>
                        {updateMutation.isPending ? getString('saving') || 'Saving…' : getString('save') || 'Save'}
                    </Button>
                </Box>
            )}
        </Stack>
    );
}

export function RecruitmentTaskPage() {
    const getString = useString();
    const { taskId } = useParams({ from: '/recruitment/$taskId/' });
    const id = Number(taskId);

    const [tab, setTab] = useState(0);
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

    const { data: task, isLoading, error } = useQuery({
        queryKey: [...RECRUITMENT_TASK_QK, id],
        queryFn: () => fetchRecruitmentTask(id),
        enabled: Number.isFinite(id),
    });

    const { data: groups = [] } = useQuery({
        queryKey: JOB_REQUIREMENT_GROUPS_QK(task?.job_id ?? 0),
        queryFn: () => fetchJobRequirementGroups(task!.job_id),
        enabled: !!task,
    });

    // Kept warm so the read-only status lookup is available app-wide.
    useQuery({ queryKey: ['recruitment_task_statuses'], queryFn: fetchRecruitmentTaskStatuses, staleTime: 5 * 60 * 1000 });

    const { updateMutation, statusMutation } = useRecruitmentTaskMutations({ setSnackbar });

    return (
        <>
            <Breadcrumbs separator={<NavigateNextIcon fontSize="small" />} sx={{ mb: 3 }}>
                <Link to="/recruitment" style={{ textDecoration: 'none', color: 'inherit' }}>
                    <Typography variant="body2" color="text.secondary">
                        {cfl(getString('recruitment') || 'Recruitment')}
                    </Typography>
                </Link>
                <Typography variant="body2" color="text.primary" fontWeight={600}>
                    {getString('recruitmentTask') || 'Recruitment task'} #{taskId}
                </Typography>
            </Breadcrumbs>

            {isLoading && (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                    <CircularProgress />
                </Box>
            )}

            {!isLoading && error && <Alert severity="error">{(error as Error).message}</Alert>}

            {!isLoading && task && (
                <Stack spacing={3}>
                    <TaskHeaderCard key={`h-${task.id}`} task={task} getString={getString} statusMutation={statusMutation} />

                    <Box>
                        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
                            <Tab label={cfl(getString('details') || 'Details')} />
                            <Tab label={cfl(getString('candidateBoard') || 'Candidates')} />
                            <Tab label={cfl(getString('jobRequirements') || 'Requirements')} />
                        </Tabs>

                        {tab === 0 && (
                            <TaskDetailsForm key={task.id} task={task} groups={groups} getString={getString} updateMutation={updateMutation} />
                        )}
                        {tab === 1 && <RecruitmentTaskBoard taskId={task.id} getString={getString} openings={task.openings} />}
                        {tab === 2 && <JobRequirementGroupsManager jobId={task.job_id} getString={getString} />}
                    </Box>
                </Stack>
            )}

            <Snackbar
                open={snackbar.open}
                autoHideDuration={6000}
                onClose={() => setSnackbar((p) => ({ ...p, open: false }))}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            >
                <Alert
                    severity={snackbar.severity}
                    onClose={() => setSnackbar((p) => ({ ...p, open: false }))}
                    sx={{ width: '100%' }}
                >
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </>
    );
}

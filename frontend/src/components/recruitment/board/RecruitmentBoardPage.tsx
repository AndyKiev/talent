// src/components/recruitment/board/RecruitmentBoardPage.tsx
//
// Standalone kanban submenu: pick the scope with a cascading filter
// (top-level department → job → recruitment task), then the per-task board
// component is REUSED as-is underneath.
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import {
    Alert,
    Box,
    Breadcrumbs,
    CircularProgress,
    MenuItem,
    Paper,
    Stack,
    TextField,
    Typography,
} from '@mui/material';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import useString from '../../../hooks/useString';
import cfl from '../../../utils/helpers.ts';
import { RECRUITMENT_TASK_QK } from '../../../utils/queryKeys';
import { fetchRecruitmentTasks } from '../tasks/recruitmentTaskApi';
import { RecruitmentTaskBoard } from '../tasks/RecruitmentTaskBoard';
import { statusLabel } from '../tasks/recruitmentStatus';

export function RecruitmentBoardPage() {
    const getString = useString();
    const [topUnitId, setTopUnitId] = useState<number | ''>('');
    const [jobId, setJobId] = useState<number | ''>('');
    const [taskId, setTaskId] = useState<number | ''>('');

    const { data: tasks = [], isLoading, error } = useQuery({
        queryKey: RECRUITMENT_TASK_QK,
        queryFn: fetchRecruitmentTasks,
        staleTime: 30 * 1000,
    });

    // Cascade: top unit narrows jobs, job narrows tasks.
    const topUnits = useMemo(() => {
        const map = new Map<number, string>();
        for (const t of tasks) if (t.top_org_unit) map.set(t.top_org_unit.id, t.top_org_unit.name);
        return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1]));
    }, [tasks]);

    const byTopUnit = useMemo(
        () => (topUnitId === '' ? tasks : tasks.filter((t) => t.top_org_unit?.id === topUnitId)),
        [tasks, topUnitId],
    );
    const jobs = useMemo(() => {
        const map = new Map<number, string>();
        for (const t of byTopUnit) if (t.job) map.set(t.job.id, t.job.name);
        return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1]));
    }, [byTopUnit]);

    const filteredTasks = useMemo(
        () => (jobId === '' ? byTopUnit : byTopUnit.filter((t) => t.job_id === jobId)),
        [byTopUnit, jobId],
    );
    const selectedTask = filteredTasks.find((t) => t.id === taskId) ?? null;

    return (
        <Box>
            <Breadcrumbs separator={<NavigateNextIcon fontSize="small" />} sx={{ mb: 3 }}>
                <Link to="/" style={{ textDecoration: 'none', color: 'inherit' }}>
                    <Typography variant="body2" color="text.secondary">
                        {cfl(getString('home') || 'Home')}
                    </Typography>
                </Link>
                <Typography variant="body2" color="text.primary" fontWeight={600}>
                    {cfl(getString('board') || 'Board')}
                </Typography>
            </Breadcrumbs>

            {isLoading && (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                    <CircularProgress />
                </Box>
            )}
            {!isLoading && error && <Alert severity="error">{(error as Error).message}</Alert>}

            {!isLoading && !error && (
                <>
                    <Stack direction="row" spacing={2} sx={{ mb: 2 }} flexWrap="wrap" useFlexGap>
                        <TextField
                            select
                            variant="outlined"
                            size="small"
                            label={getString('department') || 'Department'}
                            value={topUnitId}
                            onChange={(e) => {
                                setTopUnitId(e.target.value === '' ? '' : Number(e.target.value));
                                setJobId('');
                                setTaskId('');
                            }}
                            sx={{ minWidth: 220 }}
                        >
                            <MenuItem value="">
                                <em>{getString('allDepartments') || 'All departments'}</em>
                            </MenuItem>
                            {topUnits.map(([id, name]) => (
                                <MenuItem key={id} value={id}>
                                    {name}
                                </MenuItem>
                            ))}
                        </TextField>
                        <TextField
                            select
                            variant="outlined"
                            size="small"
                            label={getString('job') || 'Job'}
                            value={jobId}
                            onChange={(e) => {
                                setJobId(e.target.value === '' ? '' : Number(e.target.value));
                                setTaskId('');
                            }}
                            sx={{ minWidth: 220 }}
                        >
                            <MenuItem value="">
                                <em>{getString('allJobs') || 'All jobs'}</em>
                            </MenuItem>
                            {jobs.map(([id, name]) => (
                                <MenuItem key={id} value={id}>
                                    {name}
                                </MenuItem>
                            ))}
                        </TextField>
                        <TextField
                            select
                            variant="outlined"
                            size="small"
                            label={getString('recruitmentTask') || 'Recruitment task'}
                            value={taskId}
                            onChange={(e) => setTaskId(e.target.value === '' ? '' : Number(e.target.value))}
                            sx={{ minWidth: 280 }}
                        >
                            <MenuItem value="">
                                <em>{getString('selectTask') || 'Select a task'}</em>
                            </MenuItem>
                            {filteredTasks.map((t) => (
                                <MenuItem key={t.id} value={t.id}>
                                    {`#${t.id} — ${t.job?.name ?? t.job_id}`}
                                    {t.status ? ` (${statusLabel(t.status.name, getString)})` : ''}
                                </MenuItem>
                            ))}
                        </TextField>
                    </Stack>

                    {selectedTask ? (
                        <RecruitmentTaskBoard
                            taskId={selectedTask.id}
                            getString={getString}
                            openings={selectedTask.openings}
                            departmentId={selectedTask.department_id}
                        />
                    ) : (
                        <Paper
                            elevation={0}
                            sx={{ border: '1px dashed', borderColor: 'divider', p: 6, textAlign: 'center' }}
                        >
                            <Typography variant="body2" color="text.secondary">
                                {getString('boardSelectTaskHint') ||
                                    'Filter by department / job and pick a recruitment task to see its board.'}
                            </Typography>
                        </Paper>
                    )}
                </>
            )}
        </Box>
    );
}

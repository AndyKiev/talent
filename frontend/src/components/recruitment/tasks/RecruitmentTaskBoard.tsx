import { useMemo, useState } from 'react';
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
    DialogContentText,
    DialogTitle,
    Paper,
    Snackbar,
    Stack,
    Typography,
} from '@mui/material';
import useString from '../../../hooks/useString';
import type { GetStringFn } from '../../../types/getStringFn';
import { useEffectiveBooleanSetting } from '../../../hooks/useAppSetting';
import {
    CANDIDATE_APPLICATIONS_BY_TASK_QK,
    CANDIDATE_QK,
    PIPELINE_STATUS_QK,
} from '../../../utils/queryKeys';
import { fetchPipelineStatuses } from '../../candidates/candidateApi';
import {
    fetchApplicationsByTask,
    changeApplicationStatus,
    type CandidateApplication,
    type PipelineStatusKey,
} from '../../candidates/candidateApplicationApi';
import { PIPELINE_ORDER, PIPELINE_STATUS_COLOR, canMove, pipelineLabel } from '../../candidates/pipelineStatus';
import { InterviewScheduleDialog } from '../../interviews/InterviewScheduleDialog';
import { RegisterEmployeeDialog } from '../RegisterEmployeeDialog';

interface Props {
    taskId: number;
    getString: GetStringFn;
    /** Vacancy openings — offer + hired combined may not exceed this. */
    openings?: number;
    /** Task department — prefills the hired→register-employee dialog. */
    departmentId?: number | null;
}

type DragState = { appId: number; from: PipelineStatusKey } | null;
type PendingMove = { app: CandidateApplication; to: PipelineStatusKey; backward: boolean } | null;

export function RecruitmentTaskBoard({ taskId, getString, openings, departmentId }: Props) {
    const qc = useQueryClient();
    const { enabled: confirmOnDrag } = useEffectiveBooleanSetting('pipeline_drag_confirm');

    const [drag, setDrag] = useState<DragState>(null);
    const [dragOverCol, setDragOverCol] = useState<PipelineStatusKey | null>(null);
    const [pendingMove, setPendingMove] = useState<PendingMove>(null);
    // Dropping a card onto `interview` opens the scheduling dialog instead of a
    // direct move — creating the interview advances the card server-side.
    const [scheduleFor, setScheduleFor] = useState<CandidateApplication | null>(null);
    // Hired card → register the candidate as an employee.
    const [registerFor, setRegisterFor] = useState<CandidateApplication | null>(null);
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

    const { data: applications = [], isLoading, error } = useQuery({
        queryKey: CANDIDATE_APPLICATIONS_BY_TASK_QK(taskId),
        queryFn: () => fetchApplicationsByTask(taskId),
        staleTime: 15 * 1000,
    });

    // Columns come from the DB stage set (sort_order), so the board adapts if
    // the seeded statuses ever change; falls back to the static order while
    // the lookup loads.
    const { data: statusRows = [] } = useQuery({
        queryKey: PIPELINE_STATUS_QK,
        queryFn: fetchPipelineStatuses,
        staleTime: 5 * 60 * 1000,
    });
    const columnKeys = useMemo<PipelineStatusKey[]>(
        () =>
            statusRows.length
                ? [...statusRows]
                      .sort((a, b) => a.sort_order - b.sort_order)
                      .map((s) => s.name as PipelineStatusKey)
                : PIPELINE_ORDER,
        [statusRows],
    );

    const byStage = useMemo(() => {
        const map = new Map<PipelineStatusKey, CandidateApplication[]>();
        for (const key of columnKeys) map.set(key, []);
        for (const app of applications) {
            const key = app.status?.name;
            if (key) map.get(key)?.push(app);
        }
        return map;
    }, [applications, columnKeys]);

    const boardQK = CANDIDATE_APPLICATIONS_BY_TASK_QK(taskId);

    const statusMutation = useMutation({
        mutationFn: changeApplicationStatus,
        // Optimistically move the card so the board feels instant; the real
        // request runs in the background (and completes even if the user
        // navigates away — the cache already reflects the move).
        onMutate: async ({ id, statusKey }) => {
            await qc.cancelQueries({ queryKey: boardQK });
            const prev = qc.getQueryData<CandidateApplication[]>(boardQK);
            // Take the optimistic sort_order from the DB stage set (the same
            // source the columns are ordered by); the static PIPELINE_ORDER is
            // only the fallback while the lookup loads.
            const optimisticOrder =
                statusRows.find((s) => s.name === statusKey)?.sort_order ??
                PIPELINE_ORDER.indexOf(statusKey);
            qc.setQueryData<CandidateApplication[]>(boardQK, (old) =>
                (old ?? []).map((a) =>
                    a.id === id && a.status
                        ? { ...a, status: { ...a.status, name: statusKey, sort_order: optimisticOrder } }
                        : a,
                ),
            );
            return { prev };
        },
        onError: (e: Error, _vars, ctx) => {
            if (ctx?.prev) qc.setQueryData(boardQK, ctx.prev);
            setSnackbar({ open: true, message: e.message, severity: 'error' });
        },
        onSuccess: (res) => setSnackbar({ open: true, message: res.detail, severity: 'success' }),
        onSettled: () => {
            qc.invalidateQueries({ queryKey: boardQK });
            qc.invalidateQueries({ queryKey: CANDIDATE_QK });
        },
    });

    const filledCount = applications.filter(
        (a) => a.status?.name === 'offer' || a.status?.name === 'hired',
    ).length;

    const doMove = (app: CandidateApplication, to: PipelineStatusKey) =>
        statusMutation.mutate({ id: app.id, statusKey: to });

    const handleDrop = (to: PipelineStatusKey) => {
        setDragOverCol(null);
        const d = drag;
        setDrag(null);
        if (!d) return;
        if (d.from === to) return;
        const app = applications.find((a) => a.id === d.appId);
        if (!app) return;
        // Backward/unusual moves are permitted for admin/HRS (server-enforced)
        // — ALWAYS behind a consequences warning, whatever the confirm setting.
        const backward = !canMove(d.from, to);
        if (backward) {
            setPendingMove({ app, to, backward: true });
            return;
        }
        if (to === 'interview') {
            setScheduleFor(app);
            return;
        }
        if (confirmOnDrag) setPendingMove({ app, to, backward: false });
        else doMove(app, to);
    };

    if (isLoading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                <CircularProgress size={22} />
            </Box>
        );
    }
    if (error) return <Alert severity="error">{(error as Error).message}</Alert>;

    return (
        <Box>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1, minHeight: 28 }}>
                {openings != null && (
                    <Chip
                        size="small"
                        variant="outlined"
                        color={filledCount >= openings ? 'success' : 'default'}
                        label={`${getString('filled') || 'Filled'}: ${filledCount} / ${openings}`}
                    />
                )}
                {statusMutation.isPending && <CircularProgress size={16} />}
            </Stack>
            <Box sx={{ display: 'flex', gap: 1.5, overflowX: 'auto', pb: 1 }}>
                {columnKeys.map((key) => {
                    const cards = byStage.get(key) ?? [];
                    return (
                        <Paper
                            key={key}
                            elevation={0}
                            onDragOver={(e) => {
                                if (drag && drag.from !== key) {
                                    e.preventDefault();
                                    e.dataTransfer.dropEffect = 'move';
                                    if (dragOverCol !== key) setDragOverCol(key);
                                }
                            }}
                            onDragLeave={() => setDragOverCol((c) => (c === key ? null : c))}
                            onDrop={(e) => {
                                e.preventDefault();
                                handleDrop(key);
                            }}
                            sx={{
                                minWidth: 220,
                                flex: '1 0 220px',
                                border: '1px solid',
                                borderColor: dragOverCol === key ? 'primary.main' : 'divider',
                                bgcolor: dragOverCol === key ? 'action.hover' : undefined,
                                borderRadius: 2,
                                p: 1,
                                display: 'flex',
                                flexDirection: 'column',
                            }}
                        >
                            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                                <Typography variant="subtitle2" sx={{ flex: 1 }}>
                                    {pipelineLabel(key, getString)}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                    {cards.length}
                                </Typography>
                            </Stack>
                            <Stack spacing={1} sx={{ minHeight: 80 }}>
                                {cards.map((app) => (
                                    <Paper
                                        key={app.id}
                                        variant="outlined"
                                        draggable
                                        onDragStart={(e) => {
                                            e.dataTransfer.effectAllowed = 'move';
                                            e.dataTransfer.setData('text/plain', String(app.id));
                                            setDrag({ appId: app.id, from: key });
                                        }}
                                        onDragEnd={() => {
                                            setDrag(null);
                                            setDragOverCol(null);
                                        }}
                                        sx={{
                                            p: 1.25,
                                            minHeight: 84,
                                            display: 'flex',
                                            flexDirection: 'column',
                                            justifyContent: 'center',
                                            cursor: 'grab',
                                            borderLeft: '3px solid',
                                            borderLeftColor: `${PIPELINE_STATUS_COLOR[key]}.main`,
                                        }}
                                    >
                                        <Typography variant="body2" fontWeight={600}>
                                            {app.candidate
                                                ? `${app.candidate.first_name} ${app.candidate.last_name}`
                                                : `#${app.candidate_id}`}
                                        </Typography>
                                        {app.candidate?.email && (
                                            <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
                                                {app.candidate.email}
                                            </Typography>
                                        )}
                                        {key === 'hired' && (
                                            <Button
                                                size="small"
                                                variant="outlined"
                                                color="success"
                                                sx={{ mt: 0.5, alignSelf: 'flex-start' }}
                                                onClick={() => setRegisterFor(app)}
                                            >
                                                {getString('registerEmployee') || 'Register employee'}
                                            </Button>
                                        )}
                                    </Paper>
                                ))}
                            </Stack>
                        </Paper>
                    );
                })}
            </Box>

            <Dialog open={pendingMove !== null} onClose={() => setPendingMove(null)} maxWidth="xs" fullWidth>
                <DialogTitle>{getString('confirm') || 'Confirm'}</DialogTitle>
                <DialogContent>
                    {pendingMove?.backward && (
                        <Alert severity="warning" sx={{ mb: 2 }}>
                            {getString('pipelineBackwardWarn') ||
                                'You are moving the candidate BACKWARD along the pipeline. The step is recorded in the status history; interviews, offers and capacity counters stay as they are. Only admin / HRS may do this.'}
                        </Alert>
                    )}
                    <DialogContentText>
                        {getString('pipelineMoveConfirm', {
                            candidate: pendingMove?.app.candidate
                                ? `${pendingMove.app.candidate.first_name} ${pendingMove.app.candidate.last_name}`
                                : '',
                            stage: pendingMove ? pipelineLabel(pendingMove.to, getString) : '',
                        }) ||
                            `Move ${
                                pendingMove?.app.candidate
                                    ? `${pendingMove.app.candidate.first_name} ${pendingMove.app.candidate.last_name}`
                                    : ''
                            } to ${pendingMove ? pipelineLabel(pendingMove.to, getString) : ''}?`}
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setPendingMove(null)}>{getString('cancel') || 'Cancel'}</Button>
                    <Button
                        variant="contained"
                        color={pendingMove?.backward ? 'warning' : 'primary'}
                        onClick={() => {
                            if (pendingMove) doMove(pendingMove.app, pendingMove.to);
                            setPendingMove(null);
                        }}
                    >
                        {getString('confirm') || 'Confirm'}
                    </Button>
                </DialogActions>
            </Dialog>

            <InterviewScheduleDialog
                open={scheduleFor !== null}
                application={scheduleFor}
                onClose={() => setScheduleFor(null)}
                onScheduled={(detail) => {
                    setScheduleFor(null);
                    setSnackbar({ open: true, message: detail, severity: 'success' });
                }}
                onError={(message) => setSnackbar({ open: true, message, severity: 'error' })}
            />

            <RegisterEmployeeDialog
                open={registerFor !== null}
                application={registerFor}
                departmentId={departmentId}
                onClose={() => setRegisterFor(null)}
                onRegistered={(message) => {
                    setRegisterFor(null);
                    setSnackbar({ open: true, message, severity: 'success' });
                }}
                onError={(message) => setSnackbar({ open: true, message, severity: 'error' })}
            />

            <Snackbar
                open={snackbar.open}
                autoHideDuration={5000}
                onClose={() => setSnackbar((p) => ({ ...p, open: false }))}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            >
                <Alert severity={snackbar.severity} onClose={() => setSnackbar((p) => ({ ...p, open: false }))} sx={{ width: '100%' }}>
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Box>
    );
}

// Convenience wrapper for use where a local getString isn't already threaded.
export function RecruitmentTaskBoardSection({ taskId }: { taskId: number }) {
    const getString = useString();
    return <RecruitmentTaskBoard taskId={taskId} getString={getString} />;
}

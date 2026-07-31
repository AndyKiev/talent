import { useMemo, useState } from 'react';
import { PageBreadcrumbs } from '../../ui/PageBreadcrumbs';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from '@tanstack/react-router';
import {
    Alert,
    Autocomplete,
    Box,
    Button,
    Chip,
    CircularProgress,
    Paper,
    Snackbar,
    Stack,
    Tab,
    Tabs,
    TextField,
    Typography,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import dayjs from 'dayjs';
import useString from '../../../hooks/useString';
import cfl from '../../../utils/helpers.ts';
import { snakeToCamel } from '../../../utils/helpers.ts';
import {
    RECRUITMENT_CANDIDATES_QK,
    RECRUITMENT_CANDIDATE_NOTES_QK,
    RECRUITMENT_APPLICATIONS_BY_CANDIDATE_QK,
} from '../../../utils/queryKeys';
import { fetchCandidate } from './recruitmentCandidateApi';
import { useCandidateMutations } from './useRecruitmentCandidateMutations';
import { RecruitmentCandidateFormDialog } from './RecruitmentCandidateFormDialog';
import { fetchCandidateNotes, createCandidateNote } from './recruitmentCandidateNoteApi';
import {
    fetchApplicationsByCandidate,
    createApplication,
    type RecruitmentApplicationStatusKey,
} from './recruitmentApplicationApi';
import { PIPELINE_STATUS_COLOR, pipelineLabel } from './recruitmentApplicationStatus';
import { fetchRecruitmentTasks, type RecruitmentTask } from '../../recruitment/tasks/recruitmentTaskApi';
import { RECRUITMENT_INTERVIEW_FEEDBACKS_BY_CANDIDATE_QK } from '../../../utils/queryKeys';
import { fetchInterviewFeedbacks, type Recommendation } from '../interviews/recruitmentInterviewApi';
import { recommendationLabel } from '../interviews/recommendation';

const fmtDateTime = (v: string): string => dayjs(v).format('DD.MM.YYYY HH:mm');

type Snackbar = { open: boolean; message: string; severity: 'success' | 'error' };

export function RecruitmentCandidateDetailPage() {
    const getString = useString();
    const { candidateId } = useParams({ from: '/candidates/$candidateId/' });
    const id = Number(candidateId);
    const qc = useQueryClient();

    const [tab, setTab] = useState(0);
    const [editOpen, setEditOpen] = useState(false);
    const [snackbar, setSnackbar] = useState<Snackbar>({ open: false, message: '', severity: 'success' });

    const { data: candidate, isLoading, error } = useQuery({
        queryKey: [...RECRUITMENT_CANDIDATES_QK, id],
        queryFn: () => fetchCandidate(id),
        enabled: Number.isFinite(id),
    });

    const { createMutation, updateMutation } = useCandidateMutations({
        setSnackbar,
        onUpdateSuccess: () => {
            setEditOpen(false);
            qc.invalidateQueries({ queryKey: [...RECRUITMENT_CANDIDATES_QK, id] });
        },
    });

    const sourceLabel = (key: string) => getString(snakeToCamel(key)) || key;

    return (
        <Box>
            <PageBreadcrumbs
                items={[
                    { to: '/candidates', label: cfl(getString('candidates') || 'Candidates') },
                    { label: candidate ? `${candidate.first_name} ${candidate.last_name}` : `#${candidateId}` },
                ]}
            />

            {isLoading && (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                    <CircularProgress />
                </Box>
            )}
            {!isLoading && error && <Alert severity="error">{(error as Error).message}</Alert>}

            {!isLoading && candidate && (
                <>
                    <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', p: 2, mb: 2 }}>
                        <Stack direction="row" alignItems="flex-start" spacing={2}>
                            <Box sx={{ flex: 1 }}>
                                <Typography variant="h6">
                                    {candidate.first_name} {candidate.last_name}
                                </Typography>
                                <Stack direction="row" spacing={1} sx={{ mt: 0.5 }} flexWrap="wrap" useFlexGap>
                                    {candidate.source && (
                                        <Chip size="small" variant="outlined" label={sourceLabel(candidate.source.key)} />
                                    )}
                                    {candidate.email && (
                                        <Typography variant="body2" color="text.secondary">
                                            {candidate.email}
                                        </Typography>
                                    )}
                                    {candidate.phones.length > 0 && (
                                        <Typography variant="body2" color="text.secondary">
                                            {candidate.phones.map((p) => p.phone).join(', ')}
                                        </Typography>
                                    )}
                                </Stack>
                            </Box>
                            <Button size="small" startIcon={<EditIcon />} onClick={() => setEditOpen(true)}>
                                {getString('edit') || 'Edit'}
                            </Button>
                        </Stack>
                    </Paper>

                    <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
                        <Tab label={cfl(getString('timeline') || 'Timeline')} />
                        <Tab label={cfl(getString('applications') || 'Applications')} />
                        <Tab label={cfl(getString('feedback') || 'Feedback')} />
                    </Tabs>

                    {tab === 0 && <TimelineTab candidateId={id} getString={getString} onError={(m) => setSnackbar({ open: true, message: m, severity: 'error' })} />}
                    {tab === 1 && <ApplicationsTab candidateId={id} getString={getString} setSnackbar={setSnackbar} />}
                    {tab === 2 && <FeedbackTab candidateId={id} getString={getString} />}

                    <RecruitmentCandidateFormDialog
                        open={editOpen}
                        onClose={() => setEditOpen(false)}
                        createMutation={createMutation}
                        updateMutation={updateMutation}
                        editing={candidate}
                    />
                </>
            )}

            <Snackbar
                open={snackbar.open}
                autoHideDuration={6000}
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

// ── Timeline tab: add-note box + merged, time-sorted feed of notes + steps ──────
interface TabProps {
    candidateId: number;
    getString: ReturnType<typeof useString>;
}

function TimelineTab({ candidateId, getString, onError }: TabProps & { onError: (m: string) => void }) {
    const qc = useQueryClient();
    const [body, setBody] = useState('');

    const { data: notes = [] } = useQuery({
        queryKey: RECRUITMENT_CANDIDATE_NOTES_QK(candidateId),
        queryFn: () => fetchCandidateNotes(candidateId),
    });
    const { data: applications = [] } = useQuery({
        queryKey: RECRUITMENT_APPLICATIONS_BY_CANDIDATE_QK(candidateId),
        queryFn: () => fetchApplicationsByCandidate(candidateId),
    });

    const addNote = useMutation({
        mutationFn: createCandidateNote,
        onSuccess: async () => {
            await qc.invalidateQueries({ queryKey: RECRUITMENT_CANDIDATE_NOTES_QK(candidateId) });
            setBody('');
        },
        onError: (e: Error) => onError(e.message),
    });

    type Entry =
        | { kind: 'note'; at: string; creator: string; text: string }
        | { kind: 'status'; at: string; creator: string; status: RecruitmentApplicationStatusKey; job: string };

    const feed = useMemo<Entry[]>(() => {
        const entries: Entry[] = [];
        for (const n of notes) {
            entries.push({ kind: 'note', at: n.created_at, creator: n.creator?.name ?? '', text: n.body });
        }
        for (const app of applications) {
            const job = app.recruitment_task?.job?.name ?? String(app.recruitment_task_id);
            for (const h of app.status_history) {
                if (h.status) {
                    entries.push({
                        kind: 'status',
                        at: h.created_at,
                        creator: h.creator?.name ?? '',
                        status: h.status.name,
                        job,
                    });
                }
            }
        }
        return entries.sort((a, b) => dayjs(b.at).valueOf() - dayjs(a.at).valueOf());
    }, [notes, applications]);

    return (
        <Box>
            <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', p: 2, mb: 2 }}>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                    {getString('addNote') || 'Add a note'}
                </Typography>
                <TextField
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    placeholder={getString('addNotePlaceholder') || 'Add a note for the team…'}
                    fullWidth
                    multiline
                    rows={2}
                />
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
                    <Button
                        variant="contained"
                        size="small"
                        disabled={!body.trim() || addNote.isPending}
                        onClick={() => addNote.mutate({ candidate_id: candidateId, body: body.trim() })}
                    >
                        {getString('post') || 'Post'}
                    </Button>
                </Box>
            </Paper>

            {feed.length === 0 && (
                <Typography variant="body2" color="text.secondary">
                    {getString('timelineEmpty') || 'Nothing on the timeline yet.'}
                </Typography>
            )}

            <Stack spacing={1}>
                {feed.map((e, i) => (
                    <Paper key={i} elevation={0} sx={{ border: '1px solid', borderColor: 'divider', p: 1.5 }}>
                        <Stack direction="row" spacing={1} alignItems="center">
                            {e.kind === 'status' ? (
                                <Chip size="small" label={pipelineLabel(e.status, getString)} color={PIPELINE_STATUS_COLOR[e.status]} />
                            ) : (
                                <Chip size="small" variant="outlined" label={getString('note') || 'Note'} />
                            )}
                            <Typography variant="caption" color="text.secondary" sx={{ flex: 1 }}>
                                {e.creator} · {fmtDateTime(e.at)}
                                {e.kind === 'status' ? ` · ${e.job}` : ''}
                            </Typography>
                        </Stack>
                        {e.kind === 'note' && (
                            <Typography variant="body2" sx={{ mt: 0.5, whiteSpace: 'pre-wrap' }}>
                                {e.text}
                            </Typography>
                        )}
                    </Paper>
                ))}
            </Stack>
        </Box>
    );
}

// ── Feedback tab: interview feedback across all the candidate's interviews ─────
const REC_CHIP_COLOR: Record<Recommendation, 'success' | 'error' | 'warning'> = {
    hire: 'success',
    no_hire: 'error',
    maybe: 'warning',
};

function FeedbackTab({ candidateId, getString }: TabProps) {
    const { data: feedbacks = [], isLoading } = useQuery({
        queryKey: RECRUITMENT_INTERVIEW_FEEDBACKS_BY_CANDIDATE_QK(candidateId),
        queryFn: () => fetchInterviewFeedbacks({ candidate_id: candidateId }),
    });

    if (isLoading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                <CircularProgress size={22} />
            </Box>
        );
    }
    if (feedbacks.length === 0) {
        return (
            <Alert severity="info">
                {getString('noFeedbackYet') ||
                    'No feedback yet — it is written by interviewers (and HR) once interviews are scheduled.'}
            </Alert>
        );
    }
    return (
        <Stack spacing={1}>
            {feedbacks.map((f) => (
                <Paper key={f.id} elevation={0} sx={{ border: '1px solid', borderColor: 'divider', p: 1.5 }}>
                    <Stack direction="row" spacing={1} alignItems="center">
                        {f.recommendation && (
                            <Chip
                                size="small"
                                color={REC_CHIP_COLOR[f.recommendation]}
                                label={recommendationLabel(f.recommendation, getString)}
                            />
                        )}
                        <Typography variant="caption" color="text.secondary" sx={{ flex: 1 }}>
                            {f.creator?.name ?? f.created_by} · {fmtDateTime(f.created_at)}
                        </Typography>
                    </Stack>
                    <Typography variant="body2" sx={{ mt: 0.5, whiteSpace: 'pre-wrap' }}>
                        {f.body}
                    </Typography>
                </Paper>
            ))}
        </Stack>
    );
}

// ── Applications tab: apply to a task + list of applications ────────────────────
function ApplicationsTab({
    candidateId,
    getString,
    setSnackbar,
}: TabProps & { setSnackbar: (s: Snackbar) => void }) {
    const qc = useQueryClient();
    const navigate = useNavigate();
    const [task, setTask] = useState<RecruitmentTask | null>(null);

    const { data: applications = [] } = useQuery({
        queryKey: RECRUITMENT_APPLICATIONS_BY_CANDIDATE_QK(candidateId),
        queryFn: () => fetchApplicationsByCandidate(candidateId),
    });
    const { data: tasks = [] } = useQuery({
        queryKey: ['recruitment_tasks'],
        queryFn: fetchRecruitmentTasks,
    });

    const appliedTaskIds = useMemo(
        () => new Set(applications.map((a) => a.recruitment_task_id)),
        [applications],
    );
    const openTasks = useMemo(
        () =>
            tasks
                .filter((t) => !appliedTaskIds.has(t.id))
                .sort((a, b) => (a.job?.name ?? '').localeCompare(b.job?.name ?? '')),
        [tasks, appliedTaskIds],
    );

    const applyMutation = useMutation({
        mutationFn: createApplication,
        onSuccess: async (res) => {
            await Promise.all([
                qc.invalidateQueries({ queryKey: RECRUITMENT_APPLICATIONS_BY_CANDIDATE_QK(candidateId) }),
                qc.invalidateQueries({ queryKey: [...RECRUITMENT_CANDIDATES_QK, candidateId] }),
                qc.invalidateQueries({ queryKey: RECRUITMENT_CANDIDATES_QK }),
            ]);
            setTask(null);
            setSnackbar({ open: true, message: res.detail, severity: 'success' });
        },
        onError: (e: Error) => setSnackbar({ open: true, message: e.message, severity: 'error' }),
    });

    return (
        <Box>
            <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', p: 2, mb: 2 }}>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                    {getString('applyToTask') || 'Apply to a recruitment task'}
                </Typography>
                <Stack direction="row" spacing={1}>
                    <Autocomplete
                        sx={{ flex: 1 }}
                        value={task}
                        onChange={(_, v) => setTask(v)}
                        options={openTasks}
                        getOptionLabel={(o) => `${o.job?.name ?? o.job_id} (#${o.id})`}
                        isOptionEqualToValue={(a, b) => a.id === b.id}
                        renderInput={(params) => (
                            <TextField {...params} label={getString('recruitmentTask') || 'Recruitment task'} size="small" />
                        )}
                    />
                    <Button
                        variant="contained"
                        disabled={!task || applyMutation.isPending}
                        startIcon={applyMutation.isPending ? <CircularProgress size={16} color="inherit" /> : undefined}
                        onClick={() => task && applyMutation.mutate({ candidate_id: candidateId, recruitment_task_id: task.id })}
                    >
                        {applyMutation.isPending ? getString('applying') || 'Applying…' : getString('apply') || 'Apply'}
                    </Button>
                </Stack>
            </Paper>

            {applications.length === 0 && (
                <Typography variant="body2" color="text.secondary">
                    {getString('noApplicationsYet') || 'Not applied to any task yet.'}
                </Typography>
            )}

            <Stack spacing={1}>
                {applications.map((a) => {
                    const stage = a.status?.name;
                    return (
                        <Paper key={a.id} elevation={0} sx={{ border: '1px solid', borderColor: 'divider', p: 1.5 }}>
                            <Stack direction="row" alignItems="center" spacing={1}>
                                <Typography variant="body2" sx={{ flex: 1 }}>
                                    {a.recruitment_task?.job?.name ?? `#${a.recruitment_task_id}`}
                                </Typography>
                                {stage && (
                                    <Chip size="small" label={pipelineLabel(stage, getString)} color={PIPELINE_STATUS_COLOR[stage]} />
                                )}
                                <Button
                                    size="small"
                                    startIcon={<OpenInNewIcon fontSize="small" />}
                                    onClick={() =>
                                        navigate({ to: '/recruitment/$taskId', params: { taskId: String(a.recruitment_task_id) } })
                                    }
                                >
                                    {getString('board') || 'Board'}
                                </Button>
                            </Stack>
                        </Paper>
                    );
                })}
            </Stack>
        </Box>
    );
}

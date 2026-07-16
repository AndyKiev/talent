import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import {
    Alert,
    Box,
    Breadcrumbs,
    Button,
    Chip,
    CircularProgress,
    Divider,
    FormControlLabel,
    MenuItem,
    Paper,
    Snackbar,
    Stack,
    Switch,
    TextField,
    Typography,
} from '@mui/material';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import PlaceIcon from '@mui/icons-material/Place';
import EventIcon from '@mui/icons-material/Event';
import dayjs from 'dayjs';
import useString from '../../hooks/useString';
import cfl from '../../utils/helpers.ts';
import type { GetStringFn } from '../../types/getStringFn';
import { INTERVIEWS_QK } from '../../utils/queryKeys';
import {
    fetchInterviews,
    createInterviewFeedback,
    type Interview,
    type Recommendation,
} from './interviewApi';
import { RECOMMENDATION_COLOR as REC_COLOR, recommendationLabel } from './recommendation';

const fmtDateTime = (v: string): string => dayjs(v).format('DD.MM.YYYY HH:mm');

// ── Per-interview feedback composer ───────────────────────────────────────────
function FeedbackForm({
    interviewId,
    getString,
    onDone,
    onError,
}: {
    interviewId: number;
    getString: GetStringFn;
    onDone: (detail: string) => void;
    onError: (message: string) => void;
}) {
    const qc = useQueryClient();
    const [body, setBody] = useState('');
    const [rec, setRec] = useState<Recommendation | ''>('');

    const mutation = useMutation({
        mutationFn: createInterviewFeedback,
        onSuccess: async (res) => {
            await qc.invalidateQueries({ queryKey: ['interviews'] });
            await qc.invalidateQueries({ queryKey: ['interview_feedbacks'] });
            setBody('');
            setRec('');
            onDone(res.detail);
        },
        onError: (e: Error) => onError(e.message),
    });

    return (
        <Stack spacing={1} sx={{ mt: 1 }}>
            <TextField
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder={getString('feedbackPlaceholder') || 'Your feedback on the candidate…'}
                fullWidth
                multiline
                rows={2}
                size="small"
            />
            <Stack direction="row" spacing={1}>
                <TextField
                    select
                    variant="outlined"
                    size="small"
                    label={getString('recommendation') || 'Recommendation'}
                    value={rec}
                    onChange={(e) => setRec(e.target.value as Recommendation | '')}
                    sx={{ minWidth: 200 }}
                >
                    <MenuItem value="">
                        <em>{getString('noRecommendation') || 'No recommendation'}</em>
                    </MenuItem>
                    {(['hire', 'maybe', 'no_hire'] as Recommendation[]).map((r) => (
                        <MenuItem key={r} value={r}>
                            {recommendationLabel(r, getString)}
                        </MenuItem>
                    ))}
                </TextField>
                <Box sx={{ flex: 1 }} />
                <Button
                    variant="contained"
                    size="small"
                    disabled={!body.trim() || mutation.isPending}
                    startIcon={mutation.isPending ? <CircularProgress size={14} color="inherit" /> : undefined}
                    onClick={() =>
                        mutation.mutate({
                            interview_id: interviewId,
                            body: body.trim(),
                            recommendation: rec === '' ? null : rec,
                        })
                    }
                >
                    {getString('post') || 'Post'}
                </Button>
            </Stack>
        </Stack>
    );
}

// ── One interview card ────────────────────────────────────────────────────────
function InterviewCard({
    interview,
    getString,
    onDone,
    onError,
}: {
    interview: Interview;
    getString: GetStringFn;
    onDone: (detail: string) => void;
    onError: (message: string) => void;
}) {
    return (
        <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', p: 2 }}>
            <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap" useFlexGap>
                <Typography variant="subtitle1" fontWeight={600} sx={{ flex: 1 }}>
                    {interview.candidate
                        ? `${interview.candidate.first_name} ${interview.candidate.last_name}`
                        : `#${interview.application_id}`}
                    {interview.job ? ` — ${interview.job.name}` : ''}
                </Typography>
                <Stack direction="row" spacing={0.5} alignItems="center">
                    <EventIcon fontSize="small" color="disabled" />
                    <Typography variant="body2">{fmtDateTime(interview.scheduled_at)}</Typography>
                </Stack>
                <Stack direction="row" spacing={0.5} alignItems="center">
                    <PlaceIcon fontSize="small" color="disabled" />
                    <Typography variant="body2">{interview.location}</Typography>
                </Stack>
            </Stack>

            <Stack direction="row" spacing={1} sx={{ mt: 1 }} flexWrap="wrap" useFlexGap>
                {interview.interviewers.map((i) => (
                    <Chip key={i.id} size="small" variant="outlined" label={i.employee?.name ?? i.employee_id} />
                ))}
            </Stack>

            {interview.feedbacks.length > 0 && <Divider sx={{ my: 1.5 }} />}
            <Stack spacing={1}>
                {interview.feedbacks.map((f) => (
                    <Box key={f.id}>
                        <Stack direction="row" spacing={1} alignItems="center">
                            {f.recommendation && (
                                <Chip
                                    size="small"
                                    color={REC_COLOR[f.recommendation]}
                                    label={recommendationLabel(f.recommendation, getString)}
                                />
                            )}
                            <Typography variant="caption" color="text.secondary">
                                {f.author?.name ?? f.author_id} · {fmtDateTime(f.created_at)}
                            </Typography>
                        </Stack>
                        <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                            {f.body}
                        </Typography>
                    </Box>
                ))}
            </Stack>

            <Divider sx={{ my: 1.5 }} />
            <Typography variant="subtitle2">{getString('addFeedback') || 'Add feedback'}</Typography>
            <FeedbackForm interviewId={interview.id} getString={getString} onDone={onDone} onError={onError} />
        </Paper>
    );
}

export function InterviewsPage() {
    const getString = useString();
    const [mineOnly, setMineOnly] = useState(true);
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

    const { data: interviews = [], isLoading, error } = useQuery({
        queryKey: INTERVIEWS_QK('list', mineOnly ? 'mine' : 'all'),
        queryFn: () => fetchInterviews({ mine: mineOnly }),
        staleTime: 30 * 1000,
    });

    const ok = (message: string) => setSnackbar({ open: true, message, severity: 'success' });
    const fail = (message: string) => setSnackbar({ open: true, message, severity: 'error' });

    return (
        <Box>
            <Breadcrumbs separator={<NavigateNextIcon fontSize="small" />} sx={{ mb: 3 }}>
                <Link to="/" style={{ textDecoration: 'none', color: 'inherit' }}>
                    <Typography variant="body2" color="text.secondary">
                        {cfl(getString('home') || 'Home')}
                    </Typography>
                </Link>
                <Typography variant="body2" color="text.primary" fontWeight={600}>
                    {cfl(getString('interviews') || 'Interviews')}
                </Typography>
            </Breadcrumbs>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <Typography variant="h6" fontWeight={600} sx={{ flex: 1 }}>
                    {getString('interviews') || 'Interviews'}
                </Typography>
                <FormControlLabel
                    control={<Switch size="small" checked={mineOnly} onChange={(e) => setMineOnly(e.target.checked)} />}
                    label={<Typography variant="body2">{getString('myInterviewsOnly') || 'Mine only'}</Typography>}
                />
            </Box>

            {isLoading && (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                    <CircularProgress />
                </Box>
            )}
            {!isLoading && error && <Alert severity="error">{(error as Error).message}</Alert>}
            {!isLoading && !error && interviews.length === 0 && (
                <Typography variant="body2" color="text.secondary">
                    {getString('noInterviewsYet') || 'No interviews yet.'}
                </Typography>
            )}

            <Stack spacing={2}>
                {interviews.map((iv) => (
                    <InterviewCard key={iv.id} interview={iv} getString={getString} onDone={ok} onError={fail} />
                ))}
            </Stack>

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

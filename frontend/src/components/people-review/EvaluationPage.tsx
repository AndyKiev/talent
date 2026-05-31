import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from '@tanstack/react-router';
import {
    Alert,
    Box,
    Breadcrumbs,
    Button,
    Chip,
    CircularProgress,
    IconButton,
    Snackbar,
    Stack,
    Tab,
    Tabs,
    TextField,
    Tooltip,
    Typography,
    Rating,
} from '@mui/material';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import SaveIcon from '@mui/icons-material/Save';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import LockIcon from '@mui/icons-material/Lock';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import ReplayIcon from '@mui/icons-material/Replay';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { Link } from '@tanstack/react-router';
import AppShell from '../layout/AppShell.tsx';
import {
    fetchRSEDetail,
    fetchSessionEmployees,
    fetchEvaluations,
    bulkUpdateEvaluations,
    markReviewed,
    revertRSE,
    reopenRSE,
    type Evaluation,
    type EvaluationBulkUpdate,
} from './peopleReviewApi';
import { useTheme } from '../theme/ThemeContext';

const DIMENSION_COLORS: Record<string, string> = {
    TRANSFORMATION:   '#1565C0',
    ETHICS:           '#2E7D32',
    MOBILIZATION:     '#E65100',
    PEOPLE_PLANET:    '#0097A7',
    OPENNESS:         '#6A1B9A',
    CUSTOMER_RESULTS: '#AD1457',
};
const FALLBACK_COLORS = ['#1565C0','#2E7D32','#E65100','#0097A7','#6A1B9A','#AD1457','#0277BD','#558B2F'];

function getDimColor(key: string, idx: number) {
    return DIMENSION_COLORS[key] ?? FALLBACK_COLORS[idx % FALLBACK_COLORS.length];
}

interface LocalEval {
    id: number;
    dimension_id: number;
    dimension_name: string;
    dimension_key: string;
    dimension_description: string | null;
    score: number | null;
    facts: string;
    improvement: string;
}

function DimensionChart({ evals }: { evals: LocalEval[] }) {
    return (
        <Box>
            {evals.map((e, idx) => {
                const color = getDimColor(e.dimension_key, idx);
                const pct = ((e.score ?? 0) / 5) * 100;
                return (
                    <Box key={e.id} sx={{ display: 'flex', alignItems: 'center', mb: 1, gap: 1 }}>
                        <Typography fontSize={11} fontWeight={600} sx={{ width: 180, flexShrink: 0, color }} noWrap>
                            {e.dimension_name}
                        </Typography>
                        <Box sx={{ flex: 1, height: 10, borderRadius: 5, bgcolor: `${color}22`, position: 'relative' }}>
                            <Box sx={{
                                position: 'absolute', left: 0, top: 0, bottom: 0,
                                width: `${pct}%`, borderRadius: 5, bgcolor: color,
                                transition: 'width 0.4s ease',
                            }} />
                        </Box>
                        <Typography fontSize={11} fontWeight={700} sx={{ width: 28, textAlign: 'right', color }}>
                            {e.score ?? '—'}/5
                        </Typography>
                    </Box>
                );
            })}
        </Box>
    );
}

const RSE_STATUS_COLORS: Record<string, string> = {
    open: '#1565C0',
    reviewed: '#E65100',
    closed: '#2E7D32',
};

export function EvaluationPage() {
    const { rseId } = useParams({ strict: false }) as { rseId: string };
    const navigate = useNavigate();
    const qc = useQueryClient();
    const rid = Number(rseId);
    const { t } = useTheme();

    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
    const [localEvals, setLocalEvals] = useState<LocalEval[]>([]);
    const [activeTab, setActiveTab] = useState(0);

    const { data: rseDetail, isLoading: rseLoading } = useQuery({
        queryKey: ['rse_detail', rid],
        queryFn: () => fetchRSEDetail(rid),
        staleTime: 30_000,
        enabled: !!rid,
    });

    // Fetch sibling employees for prev/next navigation
    const sessionId = rseDetail?.session_id;
    const { data: siblings = [] } = useQuery({
        queryKey: ['session_employees', sessionId],
        queryFn: () => fetchSessionEmployees(sessionId!),
        staleTime: 30_000,
        enabled: !!sessionId,
    });

    const { data: evaluations = [], isLoading: evalLoading } = useQuery({
        queryKey: ['evaluations', rid],
        queryFn: () => fetchEvaluations(rid),
        staleTime: 30_000,
        enabled: !!rid,
    });

    useEffect(() => {
        if (evaluations.length > 0) {
            setLocalEvals(evaluations.map((e: Evaluation) => ({
                id: e.id,
                dimension_id: e.dimension_id,
                dimension_name: e.dimension_name,
                dimension_key: e.dimension_key,
                dimension_description: e.dimension_description ?? null,
                score: e.score,
                facts: e.facts ?? '',
                improvement: e.improvement ?? '',
            })));
        }
    }, [evaluations]);

    const saveMut = useMutation({
        mutationFn: bulkUpdateEvaluations,
        onSuccess: async (res) => {
            await qc.invalidateQueries({ queryKey: ['evaluations', rid] });
            await qc.invalidateQueries({ queryKey: ['session_employees', sessionId] });
            setSnackbar({ open: true, message: res.detail, severity: 'success' });
        },
        onError: (err: Error) => setSnackbar({ open: true, message: err.message, severity: 'error' }),
    });

    const reviewedMut = useMutation({
        mutationFn: markReviewed,
        onSuccess: async (res) => {
            await qc.invalidateQueries({ queryKey: ['rse_detail', rid] });
            await qc.invalidateQueries({ queryKey: ['session_employees', sessionId] });
            setSnackbar({ open: true, message: res.detail, severity: 'success' });
        },
        onError: (err: Error) => setSnackbar({ open: true, message: err.message, severity: 'error' }),
    });

    const revertMut = useMutation({
        mutationFn: revertRSE,
        onSuccess: async (res) => {
            await qc.invalidateQueries({ queryKey: ['rse_detail', rid] });
            await qc.invalidateQueries({ queryKey: ['session_employees', sessionId] });
            setSnackbar({ open: true, message: res.detail, severity: 'success' });
        },
        onError: (err: Error) => setSnackbar({ open: true, message: err.message, severity: 'error' }),
    });

    const reopenMut = useMutation({
        mutationFn: reopenRSE,
        onSuccess: async (res) => {
            await qc.invalidateQueries({ queryKey: ['rse_detail', rid] });
            await qc.invalidateQueries({ queryKey: ['session_employees', sessionId] });
            setSnackbar({ open: true, message: res.detail, severity: 'success' });
        },
        onError: (err: Error) => setSnackbar({ open: true, message: err.message, severity: 'error' }),
    });

    // Prev / Next employee navigation
    const siblingIds = siblings.map(s => s.id);
    const currentIdx = siblingIds.indexOf(rid);
    const prevId = currentIdx > 0 ? siblingIds[currentIdx - 1] : null;
    const nextId = currentIdx < siblingIds.length - 1 ? siblingIds[currentIdx + 1] : null;

    const goToEmployee = (id: number) => {
        navigate({ to: '/people-review/evaluation/$rseId' as any, params: { rseId: String(id) } });
    };

    const isLoading = rseLoading || evalLoading;
    const sessionStatus = rseDetail?.session_status ?? 'open';
    // Editable only if BOTH session is open AND employee status is open
    const isEditable = rseDetail?.status === 'open' && sessionStatus === 'open';
    const isSessionClosed = sessionStatus === 'closed';

    const allFilled = localEvals.length > 0 && localEvals.every(e => (e.score ?? 0) > 0);
    const filledCount = localEvals.filter(e => (e.score ?? 0) > 0).length;
    const totalCount = localEvals.length;

    const activeEval = localEvals[activeTab];
    const activeColor = activeEval ? getDimColor(activeEval.dimension_key, activeTab) : t.accent;

    const handleSave = () => {
        const updates: EvaluationBulkUpdate[] = localEvals.map(le => ({
            id: le.id, score: le.score, facts: le.facts || null, improvement: le.improvement || null,
        }));
        saveMut.mutate(updates);
    };

    const updateLocal = (id: number, field: keyof LocalEval, value: unknown) => {
        setLocalEvals(prev => prev.map(e => e.id === id ? { ...e, [field]: value } : e));
    };

    if (isLoading) {
        return (
            <AppShell>
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 6 }}><CircularProgress /></Box>
            </AppShell>
        );
    }

    return (
        <AppShell>
            <Box sx={{ p: { xs: 2, sm: 3 }, maxWidth: 960, mx: 'auto' }}>

                {/* Breadcrumbs */}
                <Breadcrumbs separator={<NavigateNextIcon fontSize="small" />} sx={{ mb: 3 }}>
                    <Link to="/people-review" style={{ textDecoration: 'none', color: 'inherit' }}>
                        <Typography variant="body2" color="text.secondary">People Review</Typography>
                    </Link>
                    {rseDetail && (
                        <Link
                            to={`/people-review/${rseDetail.session_id}` as any}
                            style={{ textDecoration: 'none', color: 'inherit' }}
                        >
                            <Typography variant="body2" color="text.secondary">
                                {rseDetail.session_name || `Session #${rseDetail.session_id}`}
                            </Typography>
                        </Link>
                    )}
                    <Typography variant="body2" color="text.primary" fontWeight={600}>
                        {rseDetail?.employee_name ?? `#${rid}`}
                    </Typography>
                </Breadcrumbs>

                {rseDetail && (
                    <>
                        {/* Header row */}
                        <Box sx={{ mb: 2.5, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
                            <Box>
                                <Stack direction="row" alignItems="center" spacing={1.5}>
                                    <Typography variant="h5" fontWeight={700} color={t.text}>
                                        {rseDetail.employee_name}
                                    </Typography>
                                    <Chip
                                        label={rseDetail.status}
                                        size="small"
                                        sx={{
                                            fontWeight: 700, fontSize: 11,
                                            bgcolor: `${RSE_STATUS_COLORS[rseDetail.status] ?? '#888'}18`,
                                            color: RSE_STATUS_COLORS[rseDetail.status] ?? '#888',
                                        }}
                                    />
                                    {isSessionClosed && (
                                        <Chip
                                            icon={<VisibilityIcon sx={{ fontSize: 13 }} />}
                                            label="View only"
                                            size="small"
                                            variant="outlined"
                                            sx={{ fontSize: 11 }}
                                        />
                                    )}
                                </Stack>
                                <Typography variant="body2" color={t.textMuted} mt={0.3}>
                                    {rseDetail.employee_code} · {rseDetail.session_name}
                                </Typography>
                            </Box>

                            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                                {/* Progress */}
                                <Box sx={{ textAlign: 'right', mr: 0.5 }}>
                                    <Typography fontSize={12} fontWeight={700} color={allFilled ? '#2E7D32' : t.textMuted}>
                                        {filledCount}/{totalCount} filled
                                    </Typography>
                                    <Box sx={{ width: 120, height: 5, borderRadius: 3, bgcolor: `${t.accent}22` }}>
                                        <Box sx={{
                                            height: '100%', borderRadius: 3,
                                            width: totalCount ? `${(filledCount / totalCount) * 100}%` : '0%',
                                            bgcolor: allFilled ? '#2E7D32' : t.accent,
                                            transition: 'width 0.3s',
                                        }} />
                                    </Box>
                                </Box>

                                {/* Mark reviewed */}
                                {isEditable && (
                                    <Tooltip
                                        title={allFilled ? 'Mark as reviewed' : `Fill all ${totalCount} dimensions (${filledCount}/${totalCount})`}
                                        placement="top"
                                    >
                                        <span>
                                            <Button
                                                size="small" variant="contained"
                                                startIcon={allFilled ? <CheckCircleIcon /> : <LockIcon />}
                                                onClick={() => reviewedMut.mutate(rid)}
                                                disabled={!allFilled || reviewedMut.isPending}
                                                sx={{
                                                    borderRadius: '8px', textTransform: 'none', fontWeight: 600, fontSize: 12,
                                                    bgcolor: allFilled ? '#2E7D32' : undefined,
                                                    '&:hover': { bgcolor: allFilled ? '#1B5E20' : undefined },
                                                }}
                                            >
                                                Mark Reviewed
                                            </Button>
                                        </span>
                                    </Tooltip>
                                )}

                                {/* Revert buttons */}
                                {rseDetail.status === 'reviewed' && sessionStatus === 'open' && (
                                    <Tooltip title="Revert to open (allow editing again)">
                                        <Button
                                            size="small" variant="outlined" startIcon={<ReplayIcon />}
                                            onClick={() => revertMut.mutate(rid)}
                                            disabled={revertMut.isPending}
                                            sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 600, fontSize: 12 }}
                                        >
                                            Revert to Open
                                        </Button>
                                    </Tooltip>
                                )}
                                {rseDetail.status === 'closed' && sessionStatus !== 'closed' && (
                                    <>
                                        <Tooltip title="Revert one step back to reviewed">
                                            <Button
                                                size="small" variant="outlined" color="warning" startIcon={<ReplayIcon />}
                                                onClick={() => revertMut.mutate(rid)}
                                                disabled={revertMut.isPending}
                                                sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 600, fontSize: 12 }}
                                            >
                                                Revert
                                            </Button>
                                        </Tooltip>
                                        <Tooltip title="Set directly to open (skip reviewed)">
                                            <Button
                                                size="small" variant="outlined" startIcon={<ReplayIcon />}
                                                onClick={() => reopenMut.mutate(rid)}
                                                disabled={reopenMut.isPending}
                                                sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 600, fontSize: 12 }}
                                            >
                                                Set Open
                                            </Button>
                                        </Tooltip>
                                    </>
                                )}

                                {/* Save */}
                                {isEditable && (
                                    <Button
                                        size="small" variant="outlined" startIcon={<SaveIcon />}
                                        onClick={handleSave} disabled={saveMut.isPending}
                                        sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 600, fontSize: 12 }}
                                    >
                                        {saveMut.isPending ? 'Saving…' : 'Save'}
                                    </Button>
                                )}

                                {/* Prev / Next employee */}
                                <Box sx={{ display: 'flex', gap: 0.5 }}>
                                    <Tooltip title={prevId ? `Previous employee` : 'No previous'}>
                                        <span>
                                            <IconButton
                                                size="small" disabled={!prevId}
                                                onClick={() => prevId && goToEmployee(prevId)}
                                                sx={{ border: `1px solid ${t.borderLight}`, borderRadius: '7px' }}
                                            >
                                                <ArrowBackIosNewIcon sx={{ fontSize: 14 }} />
                                            </IconButton>
                                        </span>
                                    </Tooltip>
                                    <Tooltip title={nextId ? `Next employee` : 'No next'}>
                                        <span>
                                            <IconButton
                                                size="small" disabled={!nextId}
                                                onClick={() => nextId && goToEmployee(nextId)}
                                                sx={{ border: `1px solid ${t.borderLight}`, borderRadius: '7px' }}
                                            >
                                                <ArrowForwardIosIcon sx={{ fontSize: 14 }} />
                                            </IconButton>
                                        </span>
                                    </Tooltip>
                                    {siblings.length > 0 && (
                                        <Typography fontSize={11} color={t.textMuted} alignSelf="center" ml={0.5}>
                                            {currentIdx + 1}/{siblings.length}
                                        </Typography>
                                    )}
                                </Box>
                            </Stack>
                        </Box>

                        {/* View-only banner */}
                        {isSessionClosed && (
                            <Alert severity="info" icon={<VisibilityIcon />} sx={{ mb: 2, borderRadius: '10px' }}>
                                This session is <strong>closed</strong> — view-only mode. Revert the session to allow edits.
                            </Alert>
                        )}
                        {!isSessionClosed && rseDetail.status !== 'open' && (
                            <Alert severity="warning" sx={{ mb: 2, borderRadius: '10px' }}>
                                Employee status is <strong>{rseDetail.status}</strong> — use "Revert" to allow editing again.
                            </Alert>
                        )}

                        {/* Score overview chart */}
                        {localEvals.length > 0 && (
                            <Box sx={{ p: 2.5, mb: 3, border: `1px solid ${t.borderLight}`, borderRadius: '12px', background: t.cardBg }}>
                                <Typography fontSize={11} fontWeight={700} color={t.textMuted} mb={1.5} textTransform="uppercase" letterSpacing="0.06em">
                                    Scores overview
                                </Typography>
                                <DimensionChart evals={localEvals} />
                            </Box>
                        )}

                        {/* Dimension tabs */}
                        {localEvals.length > 0 && (
                            <Box sx={{ border: `1px solid ${t.borderLight}`, borderRadius: '12px', overflow: 'hidden', background: t.cardBg }}>
                                <Tabs
                                    value={activeTab}
                                    onChange={(_, v) => setActiveTab(v)}
                                    variant="scrollable"
                                    scrollButtons="auto"
                                    sx={{
                                        borderBottom: `1px solid ${t.borderLight}`,
                                        '& .MuiTabs-indicator': { height: 3, borderRadius: '3px 3px 0 0', bgcolor: activeColor },
                                    }}
                                >
                                    {localEvals.map((e, idx) => {
                                        const color = getDimColor(e.dimension_key, idx);
                                        const filled = (e.score ?? 0) > 0;
                                        return (
                                            <Tab
                                                key={e.id}
                                                label={
                                                    <Stack direction="row" spacing={0.75} alignItems="center">
                                                        <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: filled ? color : `${color}44`, flexShrink: 0 }} />
                                                        <span>{e.dimension_name}</span>
                                                    </Stack>
                                                }
                                                sx={{
                                                    fontSize: 12,
                                                    fontWeight: activeTab === idx ? 700 : 500,
                                                    color: activeTab === idx ? color : t.textMuted,
                                                    textTransform: 'none',
                                                    minHeight: 48,
                                                    '&.Mui-selected': { color },
                                                }}
                                            />
                                        );
                                    })}
                                </Tabs>

                                {activeEval && (
                                    <Box sx={{ p: 3 }}>
                                        {/* Dimension header + tooltip */}
                                        <Stack direction="row" alignItems="center" spacing={1} mb={2.5}>
                                            <Box sx={{ width: 4, height: 26, borderRadius: 2, bgcolor: activeColor, flexShrink: 0 }} />
                                            <Typography variant="h6" fontWeight={700} color={activeColor}>
                                                {activeEval.dimension_name}
                                            </Typography>
                                            {activeEval.dimension_description && (
                                                <Tooltip
                                                    title={activeEval.dimension_description}
                                                    placement="right"
                                                    arrow
                                                    componentsProps={{ tooltip: { sx: { maxWidth: 340 } } }}
                                                >
                                                    <InfoOutlinedIcon sx={{ fontSize: 17, color: t.textMuted, cursor: 'help' }} />
                                                </Tooltip>
                                            )}
                                        </Stack>

                                        {/* Rating */}
                                        <Box sx={{ mb: 3 }}>
                                            <Typography fontSize={13} fontWeight={600} color={t.textSecondary} mb={0.75}>Score (0–5)</Typography>
                                            <Stack direction="row" alignItems="center" spacing={1.5}>
                                                <Rating
                                                    value={activeEval.score ?? 0}
                                                    max={5}
                                                    onChange={(_, v) => { if (isEditable) updateLocal(activeEval.id, 'score', v); }}
                                                    readOnly={!isEditable}
                                                    size="large"
                                                    sx={{ '& .MuiRating-iconFilled': { color: activeColor }, '& .MuiRating-iconHover': { color: activeColor } }}
                                                />
                                                <Typography fontWeight={700} color={activeColor} fontSize={15}>
                                                    {activeEval.score !== null ? `${activeEval.score}/5` : '—'}
                                                </Typography>
                                            </Stack>
                                        </Box>

                                        <TextField
                                            label="Facts & achievements"
                                            value={activeEval.facts}
                                            onChange={e => updateLocal(activeEval.id, 'facts', e.target.value)}
                                            fullWidth multiline rows={3} sx={{ mb: 2 }}
                                            disabled={!isEditable}
                                        />
                                        <TextField
                                            label="Areas for improvement (optional)"
                                            value={activeEval.improvement}
                                            onChange={e => updateLocal(activeEval.id, 'improvement', e.target.value)}
                                            fullWidth multiline rows={2}
                                            disabled={!isEditable}
                                        />

                                        {/* Prev / Next tab */}
                                        <Stack direction="row" justifyContent="space-between" mt={2.5}>
                                            <Button size="small" disabled={activeTab === 0}
                                                onClick={() => setActiveTab(p => p - 1)}
                                                sx={{ textTransform: 'none', color: t.textMuted }}>
                                                ← Previous dimension
                                            </Button>
                                            <Button size="small" disabled={activeTab === localEvals.length - 1}
                                                onClick={() => setActiveTab(p => p + 1)}
                                                sx={{ textTransform: 'none', color: activeColor }}>
                                                Next dimension →
                                            </Button>
                                        </Stack>
                                    </Box>
                                )}
                            </Box>
                        )}
                    </>
                )}
            </Box>

            <Snackbar open={snackbar.open} autoHideDuration={5000}
                onClose={() => setSnackbar(p => ({ ...p, open: false }))}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
                <Alert severity={snackbar.severity} onClose={() => setSnackbar(p => ({ ...p, open: false }))} sx={{ width: '100%' }}>
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </AppShell>
    );
}

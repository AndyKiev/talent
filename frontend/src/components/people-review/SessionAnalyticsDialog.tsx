import { useQuery } from '@tanstack/react-query';
import {
    Box,
    CircularProgress,
    Dialog,
    DialogContent,
    DialogTitle,
    Divider,
    IconButton,
    Stack,
    Tooltip,
    Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { axiosInstance } from '../../api/axiosInstance';
import { BASE_URL } from '../../utils/eNums';
import { MAX_GRADE } from './peopleReviewApi';
import { getDimColor } from './evaluation/evaluationHelpers';
import { useTheme } from '../theme/ThemeContext';

// ── Types ────────────────────────────────────────────────────────────────────
interface DimensionAnalytics {
    dimension_id: number;
    dimension_name: string;
    dimension_key: string;
    dimension_description: string | null;
    dimension_color: string;
    dimension_sort_order: number;
    total_evaluations: number;
    scored_count: number;
    avg_score: number | null;
    min_score: number | null;
    max_score: number | null;
}

async function fetchAnalytics(sessionId: number): Promise<DimensionAnalytics[]> {
    const res = await axiosInstance.get<DimensionAnalytics[]>(
        `${BASE_URL}/review_sessions/${sessionId}/analytics`,
    );
    return res.data ?? [];
}

// ── Bar row ───────────────────────────────────────────────────────────────────
function DimBar({ dim, idx }: { dim: DimensionAnalytics; idx: number }) {
    const color = getDimColor(dim.dimension_key, idx, dim.dimension_color);
    const avg = dim.avg_score ?? 0;
    const pct = (avg / MAX_GRADE) * 100;
    const minPct = ((dim.min_score ?? 0) / MAX_GRADE) * 100;
    const maxPct = ((dim.max_score ?? 0) / MAX_GRADE) * 100;
    const coverage = dim.total_evaluations > 0
        ? Math.round((dim.scored_count / dim.total_evaluations) * 100)
        : 0;

    return (
        <Box>
            {/* Label row */}
            <Stack direction="row" alignItems="center" justifyContent="space-between" mb={0.5}>
                <Stack direction="row" alignItems="center" spacing={0.75}>
                    <Typography fontSize={13} fontWeight={700} color={color}>
                        {dim.dimension_name}
                    </Typography>
                    {dim.dimension_description && (
                        <Tooltip
                            title={dim.dimension_description}
                            placement="right"
                            arrow
                            componentsProps={{ tooltip: { sx: { maxWidth: 300 } } }}
                        >
                            <InfoOutlinedIcon sx={{ fontSize: 14, color: '#aaa', cursor: 'help' }} />
                        </Tooltip>
                    )}
                </Stack>
                <Stack direction="row" spacing={2} alignItems="center">
                    <Typography fontSize={11} color="#aaa">
                        {dim.scored_count}/{dim.total_evaluations} scored ({coverage}%)
                    </Typography>
                    <Typography fontSize={13} fontWeight={800} color={color} sx={{ minWidth: 36, textAlign: 'right' }}>
                        {dim.avg_score !== null ? dim.avg_score.toFixed(2) : '—'}/{MAX_GRADE}
                    </Typography>
                </Stack>
            </Stack>

            {/* Bar track */}
            <Box sx={{ position: 'relative', height: 14, borderRadius: 7, bgcolor: `${color}18` }}>
                {/* Min–Max range highlight */}
                {dim.min_score !== null && dim.max_score !== null && dim.max_score > dim.min_score && (
                    <Box sx={{
                        position: 'absolute',
                        left: `${minPct}%`,
                        width: `${maxPct - minPct}%`,
                        top: 0, bottom: 0,
                        borderRadius: 7,
                        bgcolor: `${color}30`,
                    }} />
                )}
                {/* Average bar */}
                <Box sx={{
                    position: 'absolute',
                    left: 0, top: 0, bottom: 0,
                    width: `${pct}%`,
                    borderRadius: 7,
                    bgcolor: color,
                    transition: 'width 0.5s ease',
                }} />
            </Box>

            {/* Min / Max labels */}
            {dim.min_score !== null && dim.max_score !== null && (
                <Stack direction="row" justifyContent="space-between" mt={0.25}>
                    <Typography fontSize={10} color="#bbb">min {dim.min_score}</Typography>
                    <Typography fontSize={10} color="#bbb">max {dim.max_score}</Typography>
                </Stack>
            )}
        </Box>
    );
}

// ── Dialog ────────────────────────────────────────────────────────────────────
interface Props {
    sessionId: number;
    sessionName: string;
    open: boolean;
    onClose: () => void;
}

export function SessionAnalyticsDialog({ sessionId, sessionName, open, onClose }: Props) {
    const { t } = useTheme();

    const { data = [], isLoading } = useQuery({
        queryKey: ['session_analytics', sessionId],
        queryFn: () => fetchAnalytics(sessionId),
        enabled: open,
        staleTime: 30_000,
    });

    // Overall average across all dimensions
    const scored = data.filter(d => d.avg_score !== null);
    const overallAvg = scored.length > 0
        ? scored.reduce((s, d) => s + (d.avg_score ?? 0), 0) / scored.length
        : null;

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="sm"
            fullWidth
            PaperProps={{ sx: { borderRadius: '14px', background: t.cardBg } }}
        >
            <DialogTitle sx={{ pb: 1 }}>
                <Stack direction="row" alignItems="flex-start" justifyContent="space-between">
                    <Box>
                        <Typography fontWeight={700} fontSize={17} color={t.text}>
                            Session Analytics
                        </Typography>
                        <Typography fontSize={12} color={t.textMuted}>{sessionName}</Typography>
                    </Box>
                    <IconButton size="small" onClick={onClose} sx={{ color: t.textMuted, mt: -0.5 }}>
                        <CloseIcon fontSize="small" />
                    </IconButton>
                </Stack>
            </DialogTitle>

            <Divider sx={{ borderColor: t.borderLight }} />

            <DialogContent sx={{ pt: 2.5 }}>
                {isLoading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                        <CircularProgress size={36} />
                    </Box>
                ) : data.length === 0 ? (
                    <Typography color={t.textMuted} textAlign="center" py={3}>
                        No evaluation data yet for this session.
                    </Typography>
                ) : (
                    <>
                        {/* Overall score */}
                        {overallAvg !== null && (
                            <Box sx={{
                                mb: 3, p: 2, borderRadius: '10px',
                                background: `${t.accent}10`, border: `1px solid ${t.accent}30`,
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            }}>
                                <Typography fontSize={13} fontWeight={600} color={t.text}>
                                    Overall average score
                                </Typography>
                                <Typography fontSize={22} fontWeight={800} color={t.accent}>
                                    {overallAvg.toFixed(2)}/{MAX_GRADE}
                                </Typography>
                            </Box>
                        )}

                        {/* Per-dimension bars */}
                        <Stack spacing={2.5}>
                            {data.map((dim, idx) => (
                                <DimBar key={dim.dimension_id} dim={dim} idx={idx} />
                            ))}
                        </Stack>

                        {/* Legend */}
                        <Stack direction="row" spacing={2} mt={2.5} justifyContent="center">
                            <Stack direction="row" alignItems="center" spacing={0.5}>
                                <Box sx={{ width: 20, height: 6, borderRadius: 3, bgcolor: '#aaa', opacity: 0.5 }} />
                                <Typography fontSize={11} color={t.textMuted}>min–max range</Typography>
                            </Stack>
                            <Stack direction="row" alignItems="center" spacing={0.5}>
                                <Box sx={{ width: 20, height: 6, borderRadius: 3, bgcolor: t.accent }} />
                                <Typography fontSize={11} color={t.textMuted}>average</Typography>
                            </Stack>
                        </Stack>
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
}

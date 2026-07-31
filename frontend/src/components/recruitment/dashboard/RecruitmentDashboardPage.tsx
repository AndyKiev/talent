// src/components/recruitment/dashboard/RecruitmentDashboardPage.tsx
//
// Recruitment welcome/overview screen: navigation cards to the sub-screens on
// top (same set as the submenu) + a tasks-per-status bar chart for an editable
// period range (start / end picked with the iOS-style date wheel).
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import {
    Box,
    Button,
    Card,
    CardActionArea,
    CardContent,
    CircularProgress,
    Paper,
    Stack,
    Typography,
} from '@mui/material';
import AssignmentRounded from '@mui/icons-material/AssignmentRounded';
import ViewKanbanRounded from '@mui/icons-material/ViewKanbanRounded';
import RecentActorsRounded from '@mui/icons-material/RecentActorsRounded';
import ForumRounded from '@mui/icons-material/ForumRounded';
import dayjs from 'dayjs';
import useString from '../../../hooks/useString';
import { RECRUITMENT_TASKS_QK } from '../../../utils/queryKeys';
import { formatToUkrDate } from '../../../utils/dateFormatter';
import DateWheelDialog from '../../employees/headcount_plan/DateWheelDialog';
import { fetchRecruitmentTasks, type RecruitmentStatusKey } from '../tasks/recruitmentTaskApi';
import { statusLabel } from '../tasks/recruitmentStatus';

const STATUS_ORDER: RecruitmentStatusKey[] = ['created', 'in_process', 'fulfilled', 'rejected'];

// Chip-palette → theme color for the bar fills ('default' → grey).
const BAR_COLOR: Record<RecruitmentStatusKey, string> = {
    created: 'grey.500',
    in_process: 'info.main',
    fulfilled: 'success.main',
    rejected: 'error.main',
};

export function RecruitmentDashboardPage() {
    const getString = useString();
    const navigate = useNavigate();

    const [start, setStart] = useState(dayjs().startOf('year').format('YYYY-MM-DD'));
    const [end, setEnd] = useState(dayjs().endOf('year').format('YYYY-MM-DD'));
    const [pick, setPick] = useState<'start' | 'end' | null>(null);

    const { data: tasks = [], isLoading } = useQuery({
        queryKey: RECRUITMENT_TASKS_QK,
        queryFn: fetchRecruitmentTasks,
        staleTime: 30 * 1000,
    });

    const counts = useMemo(() => {
        const from = dayjs(start).startOf('day');
        const to = dayjs(end).endOf('day');
        const acc: Record<RecruitmentStatusKey, number> = {
            created: 0,
            in_process: 0,
            fulfilled: 0,
            rejected: 0,
        };
        for (const t of tasks) {
            const created = dayjs(t.created_at);
            if (created.isBefore(from) || created.isAfter(to)) continue;
            const key = t.status?.name;
            if (key) acc[key] += 1;
        }
        return acc;
    }, [tasks, start, end]);
    const maxCount = Math.max(1, ...STATUS_ORDER.map((k) => counts[k]));

    const CARDS = [
        { key: 'tasks', to: '/recruitment', labelKey: 'recruitmentTasks', fallback: 'Tasks', Icon: AssignmentRounded },
        { key: 'board', to: '/recruitment_board', labelKey: 'board', fallback: 'Board', Icon: ViewKanbanRounded },
        { key: 'candidates', to: '/candidates', labelKey: 'candidates', fallback: 'Candidates', Icon: RecentActorsRounded },
        { key: 'interviews', to: '/interviews', labelKey: 'interviews', fallback: 'Interviews', Icon: ForumRounded },
    ] as const;

    return (
        <Box>
            <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
                {getString('recruitmentOverview') || 'Recruitment overview'}
            </Typography>

            {/* ── Navigation cards ─────────────────────────────────────────── */}
            <Box
                sx={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                    gap: 2,
                    mb: 3,
                }}
            >
                {CARDS.map(({ key, to, labelKey, fallback, Icon }) => (
                    <Card key={key} variant="outlined">
                        <CardActionArea onClick={() => navigate({ to })}>
                            <CardContent>
                                <Stack direction="row" spacing={1.5} alignItems="center">
                                    <Icon color="primary" />
                                    <Typography variant="subtitle1" fontWeight={600}>
                                        {getString(labelKey) || fallback}
                                    </Typography>
                                </Stack>
                            </CardContent>
                        </CardActionArea>
                    </Card>
                ))}
            </Box>

            {/* ── Tasks per status for the period ──────────────────────────── */}
            <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', p: 2 }}>
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }} flexWrap="wrap" useFlexGap>
                    <Typography variant="subtitle1" fontWeight={600} sx={{ flex: 1 }}>
                        {getString('tasksByStatus') || 'Tasks by status'}
                    </Typography>
                    <Button size="small" variant="outlined" onClick={() => setPick('start')}>
                        {formatToUkrDate(start)}
                    </Button>
                    <Typography variant="body2" color="text.secondary">
                        —
                    </Typography>
                    <Button size="small" variant="outlined" onClick={() => setPick('end')}>
                        {formatToUkrDate(end)}
                    </Button>
                </Stack>

                {isLoading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                        <CircularProgress size={22} />
                    </Box>
                ) : (
                    <Stack direction="row" spacing={4} alignItems="flex-end" sx={{ px: 2, minHeight: 220 }}>
                        {STATUS_ORDER.map((key) => (
                            <Stack key={key} alignItems="center" spacing={0.5} sx={{ flex: 1 }}>
                                <Typography variant="subtitle2">{counts[key]}</Typography>
                                <Box
                                    sx={{
                                        width: '60%',
                                        maxWidth: 96,
                                        height: `${(counts[key] / maxCount) * 160}px`,
                                        minHeight: 2,
                                        bgcolor: BAR_COLOR[key],
                                        borderRadius: '6px 6px 0 0',
                                        transition: 'height 0.3s',
                                    }}
                                />
                                <Typography variant="caption" color="text.secondary">
                                    {statusLabel(key, getString)}
                                </Typography>
                            </Stack>
                        ))}
                    </Stack>
                )}
            </Paper>

            {/* Start / end pickers on the date wheel. */}
            <DateWheelDialog
                open={pick === 'start'}
                onClose={() => setPick(null)}
                value={start}
                titleKey="periodStart"
                getString={getString}
                onSave={(iso) => {
                    setStart(iso);
                    if (dayjs(iso).isAfter(dayjs(end))) setEnd(iso);
                }}
            />
            <DateWheelDialog
                open={pick === 'end'}
                onClose={() => setPick(null)}
                value={end}
                titleKey="periodEnd"
                getString={getString}
                onSave={(iso) => {
                    setEnd(iso);
                    if (dayjs(iso).isBefore(dayjs(start))) setStart(iso);
                }}
            />
        </Box>
    );
}

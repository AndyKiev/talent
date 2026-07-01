// src/components/planning/PlanSessionDetailPage.tsx
//
// One plan session, opened from the list at /planning/$sessionId (mirrors
// people-review's /people_review/$sessionId). The `view` search param chooses
// the plan-values (scope) editor or the plan-vs-fact report; a toggle switches
// between them. The session id in the URL maps to the backend plan_sessions/{id}.
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate, useParams, useSearch } from '@tanstack/react-router';
import {
    Alert,
    Box,
    Breadcrumbs,
    CircularProgress,
    ToggleButton,
    ToggleButtonGroup,
    Typography,
} from '@mui/material';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import AppShell from '../layout/AppShell';
import { PlanScopeGrid } from './PlanScopeGrid';
import { PlanReportGrid } from './PlanReportGrid';
import { fetchPlanSessionById } from './planningApi';
import { PLAN_SESSION_QK } from '../../utils/queryKeys.ts';
import useString from '../../hooks/useString';
import cfl from '../../utils/helpers.ts';

const ROUTE_ID = '/planning/$sessionId/';

export function PlanSessionDetailPage() {
    const getString = useString();
    const navigate = useNavigate();
    const { sessionId } = useParams({ from: ROUTE_ID });
    const { view } = useSearch({ from: ROUTE_ID });
    const sid = Number(sessionId);

    const { data: session, isLoading, error } = useQuery({
        queryKey: [...PLAN_SESSION_QK, sid],
        queryFn: () => fetchPlanSessionById(sid),
        enabled: !!sid,
    });

    const setView = (next: 'scope' | 'report') =>
        navigate({
            to: '/planning/$sessionId',
            params: { sessionId: String(sid) },
            search: { view: next },
            replace: true,
        });

    return (
        <AppShell>
            <Box
                sx={{
                    p: { xs: 2, sm: 3 },
                    maxWidth: 1300,
                    mx: 'auto',
                    height: 'calc(100vh - 56px)',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                }}
            >
                <Breadcrumbs separator={<NavigateNextIcon fontSize="small" />} sx={{ mb: 2 }}>
                    <Link to="/" style={{ textDecoration: 'none', color: 'inherit' }}>
                        <Typography variant="body2" color="text.secondary">
                            {cfl(getString('home') || 'Home')}
                        </Typography>
                    </Link>
                    <Link to="/planning" style={{ textDecoration: 'none', color: 'inherit' }}>
                        <Typography variant="body2" color="text.secondary">
                            {cfl(getString('planning') || 'Planning')}
                        </Typography>
                    </Link>
                    <Typography variant="body2" color="text.primary" fontWeight={600}>
                        {session
                            ? view === 'report'
                                ? `${session.name} — ${cfl(getString('planVsFact')) || 'Plan vs Fact'}`
                                : session.name
                            : '…'}
                    </Typography>
                </Breadcrumbs>

                <Box sx={{ mb: 2 }}>
                    <ToggleButtonGroup
                        size="small"
                        exclusive
                        value={view}
                        onChange={(_, v: 'scope' | 'report' | null) => { if (v) setView(v); }}
                    >
                        <ToggleButton value="scope">{cfl(getString('planValues')) || 'Plan Values'}</ToggleButton>
                        <ToggleButton value="report">{cfl(getString('planVsFact')) || 'Plan vs Fact'}</ToggleButton>
                    </ToggleButtonGroup>
                </Box>

                {isLoading && (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                        <CircularProgress />
                    </Box>
                )}
                {!isLoading && error && (
                    <Alert severity="error">{(error as Error).message}</Alert>
                )}
                {session && (
                    <Box sx={{ flex: 1, minHeight: 0 }}>
                        {view === 'report'
                            ? <PlanReportGrid session={session} />
                            : <PlanScopeGrid session={session} />}
                    </Box>
                )}
            </Box>
        </AppShell>
    );
}

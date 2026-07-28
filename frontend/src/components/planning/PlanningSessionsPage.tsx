// src/components/planning/PlanningSessionsPage.tsx
//
// Planning landing = the plan-sessions list (mirrors the people-review sessions
// list). Selecting a session navigates to /planning/$sessionId, where the URL
// segment maps to the backend plan_sessions/{id} resource. The list's two row
// actions (edit plan / show report) both open that route, differing only by the
// `view` search param.
import AppShell from '../layout/AppShell';
import { Box } from '@mui/material';
import { useNavigate } from '@tanstack/react-router';
import { PlanSessionsCrud } from './PlanSessionsCrud';
import type { PlanSession } from './planningApi';
import useString from '../../hooks/useString';
import cfl from '../../utils/helpers.ts';
import { PageBreadcrumbs } from '../ui/PageBreadcrumbs';

export function PlanningSessionsPage() {
    const getString = useString();
    const navigate = useNavigate();

    const goToSession = (session: PlanSession, view: 'scope' | 'report') =>
        navigate({
            to: '/planning/$sessionId',
            params: { sessionId: String(session.id) },
            search: { view },
        });

    return (
        <AppShell>
            <Box
                sx={{
                    p: { xs: 2, sm: 3 },
                    maxWidth: 1800,
                    mx: 'auto',
                    width: '100%',
                    // Fixed-height page so the sessions grid scrolls internally with
                    // pinned headers instead of the page scrolling under the AppBar.
                    height: 'calc(100vh - 56px)',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                }}
            >
                <PageBreadcrumbs
                    items={[
                        { to: '/', label: cfl(getString('home') || 'Home') },
                        { label: cfl(getString('planning') || 'Planning') },
                    ]}
                />

                <Box sx={{ flex: 1, minHeight: 0 }}>
                    <PlanSessionsCrud
                        onEditPlan={(s) => goToSession(s, 'scope')}
                        onShowReport={(s) => goToSession(s, 'report')}
                    />
                </Box>
            </Box>
        </AppShell>
    );
}

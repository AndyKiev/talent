// People-review landing dispatcher.
//
// - Managers KEEP the full management page (sessions list / create / open / close):
//   a manager holds a SUPERVISION role (department subtree) OR belongs to a
//   management group (admin / HRM / HRS / dev).
// - Everyone else fills only their own data -> redirect straight to their row in
//   the most-recently-created OPEN session. This includes a user whose only role is
//   OVERSIGHT (a linked-employee roster) and who isn't in a management group: an
//   oversight-only role does NOT grant management access. If they aren't listed in
//   any open session, show a "not listed — ask your supervisor" message instead.
import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { Alert, Box, CircularProgress } from '@mui/material';
import AppShell from '../layout/AppShell.tsx';
import { ReviewSessionsPage } from './ReviewSessionsPage.tsx';
import { fetchMyScopes, fetchMyLatestOpenReview } from './peopleReviewApi';
import {
    PEOPLE_REVIEW_MY_SCOPES_QK,
    PEOPLE_REVIEW_MY_LATEST_QK,
} from '../../utils/queryKeys';
import { useAuthStore } from '../../store/authStore';
import useString from '../../hooks/useString';

// Membership in any of these groups keeps a user on the management page even
// without a supervision role (case-insensitive match against AuthUser.groups).
const MGMT_GROUPS = ['admin', 'hrm', 'hrs', 'dev'];

function Centered({ children }: { children: React.ReactNode }) {
    return (
        <AppShell>
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 6 }}>{children}</Box>
        </AppShell>
    );
}

export function PeopleReviewEntry() {
    const navigate = useNavigate();
    const getString = useString();
    const user = useAuthStore((s) => s.user);

    const inMgmtGroup = (user?.groups ?? []).some((g) =>
        MGMT_GROUPS.includes(g.toLowerCase()),
    );

    const { data: scopes, isLoading: scopesLoading, isError: scopesError } = useQuery({
        queryKey: PEOPLE_REVIEW_MY_SCOPES_QK,
        queryFn: fetchMyScopes,
        staleTime: 60_000,
        enabled: !inMgmtGroup, // a group manager already stays on mgmt; skip the call
    });

    // Only a SUPERVISION role (link_target 'department') keeps a user on the
    // management page; an oversight-only role does not.
    const hasSupervisionRole = (scopes?.roles ?? []).some((r) => r.link_target === 'department');
    // Redirect candidate = non-manager user, once the user (for the group check) AND
    // scopes have loaded. `user` is null on a hard refresh until /me repopulates it
    // (authStore persists only the token), so gate on it — otherwise a group-only
    // manager could be wrongly redirected before their groups are known.
    const redirectCandidate = !!user && !inMgmtGroup && !!scopes && !hasSupervisionRole;

    const { data: latest, isLoading: latestLoading } = useQuery({
        queryKey: PEOPLE_REVIEW_MY_LATEST_QK,
        queryFn: fetchMyLatestOpenReview,
        enabled: redirectCandidate,
        staleTime: 30_000,
    });

    useEffect(() => {
        if (redirectCandidate && latest) {
            navigate({
                to: '/people_review/$sessionId/employee/$employeeId',
                params: {
                    sessionId: String(latest.session_id),
                    employeeId: String(latest.employee_id),
                },
                replace: true,
            });
        }
    }, [redirectCandidate, latest, navigate]);

    // Wait for /me before deciding: a null user can't have its groups checked yet,
    // so treat it as a loading state (covers both wrong-redirect and wrong-message).
    if (!user) return <Centered><CircularProgress /></Centered>;

    // Managers (mgmt group or supervision role) -> existing management page.
    // On a scopes failure, fall back to the management page rather than a blank screen.
    if (inMgmtGroup || hasSupervisionRole || scopesError) return <ReviewSessionsPage />;

    // Still resolving scopes, or fetching / about to navigate to the user's review.
    if (scopesLoading || !scopes || (redirectCandidate && (latestLoading || latest))) {
        return <Centered><CircularProgress /></Centered>;
    }

    // Role-less, non-manager, not listed in any open session.
    return (
        <AppShell>
            <Box sx={{ p: { xs: 2, sm: 3 }, maxWidth: 720, mx: 'auto' }}>
                <Alert severity="info">{getString('notListedInOpenSession')}</Alert>
            </Box>
        </AppShell>
    );
}

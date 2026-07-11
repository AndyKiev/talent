// src/components/people-review/useOnlyMeMode.ts
//
// 'Only me' mode = a user who fills ONLY their own review data: not in a
// management group and without ANY people-review role (neither supervision nor
// oversight). Mirrors the dispatch logic of PeopleReviewEntry, which redirects
// such users straight to their own row in the open session. Used to hide
// session-level navigation (e.g. the session breadcrumb link) from them.
import { useQuery } from '@tanstack/react-query';
import { fetchMyScopes } from './peopleReviewApi';
import { PEOPLE_REVIEW_MY_SCOPES_QK } from '../../utils/queryKeys';
import { useAuthStore } from '../../store/authStore';

// Membership in any of these groups grants session management access even
// without a supervision role (case-insensitive match against AuthUser.groups).
export const MGMT_GROUPS = ['admin', 'hrm', 'hrs', 'dev'];

export function useOnlyMeMode(): boolean {
    const user = useAuthStore((s) => s.user);

    const inMgmtGroup = (user?.groups ?? []).some((g) =>
        MGMT_GROUPS.includes(g.toLowerCase()),
    );

    const { data: scopes } = useQuery({
        queryKey: PEOPLE_REVIEW_MY_SCOPES_QK,
        queryFn: fetchMyScopes,
        staleTime: 60_000,
        enabled: !!user && !inMgmtGroup,
    });

    const hasAnyRole = (scopes?.roles ?? []).length > 0;

    // Only true once the user AND scopes are known — while loading we treat the
    // user as NOT only-me so role holders never see navigation flicker away.
    return !!user && !inMgmtGroup && !!scopes && !hasAnyRole;
}

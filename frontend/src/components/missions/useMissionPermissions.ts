// src/components/missions/useMissionPermissions.ts
//
// UI AFFORDANCE ONLY. These flags decide which buttons render; they are not the
// access control. The server re-derives every one of them independently
// (EmployeeMissionAccess.assert_can_manage / _can_author / _can_read), so a
// wrong flag here can only hide a control or produce a 403 — never grant access.
import { useQuery } from '@tanstack/react-query';
import { fetchMyScopes } from '../people-review/peopleReviewApi';
import { useAuthStore } from '../../store/authStore';
import { PEOPLE_REVIEW_MY_SCOPES_QK } from '../../utils/queryKeys';

/** Groups allowed to read the mission/KPI change trail. Mirrors the backend
 *  HR_VIEW_ONLY_ESSENCES grant for employee_mission_history. */
const HISTORY_GROUPS = ['admin', 'HRM', 'HRS'];

export interface MissionPermissions {
    /** Create/edit/delete missions + KPIs, and set fulfilment percentages. */
    canManage: boolean;
    /** Write comments and the development vision (the employee's own surface). */
    canAuthor: boolean;
    /** Open the change-history dialog. */
    canViewHistory: boolean;
    /** True when the user holds an oversight role but has not switched into it —
     *  the reason their manage controls are missing, worth telling them. */
    oversightModeOff: boolean;
}

export function useMissionPermissions(employeeId: number | undefined): MissionPermissions {
    const user = useAuthStore((s) => s.user);

    // The active people-review mode decides whether an oversight manager is
    // currently acting as one; with no mode on, the backend sees them as
    // "only myself" and refuses mission writes.
    const { data: scopes } = useQuery({
        queryKey: PEOPLE_REVIEW_MY_SCOPES_QK,
        queryFn: fetchMyScopes,
        staleTime: 5 * 60 * 1000,
    });

    const groups = user?.groups ?? [];
    const isAdminLike = groups.includes('admin') || !!user?.can_access_test;

    const activeRoleId = scopes?.active.process_role_id ?? null;
    const activeRole = scopes?.roles.find((r) => r.process_role_id === activeRoleId) ?? null;
    const isOversightActive = activeRole?.link_target === 'employee';
    const holdsOversightRole = (scopes?.roles ?? []).some((r) => r.link_target === 'employee');

    // Own id is always within one's own people-review scope, so an oversight
    // manager must be excluded from managing themselves — mirrors the same
    // exclusion in EmployeeMissionAccess._is_oversight_for.
    const isSelf = employeeId != null && employeeId === user?.id;

    return {
        canManage: isAdminLike || (isOversightActive && !isSelf),
        canAuthor: isAdminLike || isSelf,
        canViewHistory: isAdminLike || groups.some((g) => HISTORY_GROUPS.includes(g)),
        oversightModeOff: !isAdminLike && holdsOversightRole && !isOversightActive && !isSelf,
    };
}

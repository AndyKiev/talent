import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import {
    fetchRSEBySessionEmployee,
    fetchMyScopes,
    fetchSessionEmployees,
    fetchEvaluations,
    fetchLanguageLevels,
    fetchEmployeeLanguageProfile,
    fetchReviewLevels,
    fetchSessionLevels,
    fetchProposedLevel,
    fetchReviewComments,
} from '../../peopleReviewApi';
import { PEOPLE_REVIEW_MY_SCOPES_QK } from '../../../../utils/queryKeys';
import { useSiblingPrefetch } from '../../useSiblingPrefetch';

/**
 * All per-page data fetching for the evaluation screen, plus the scope-realign
 * redirect. Query keys and stale times are preserved exactly (they're invalidated
 * by mutations elsewhere). Nothing here auto-polls: per-person data refetches on
 * navigation, on mutation, and on tab refocus; supervisors get `refreshPersonData`
 * for an explicit pull. Editors never refetch in the background (draft-safe).
 */
export function useEvaluationQueries(sid: number, eid: number) {
    const navigate = useNavigate();
    const qc = useQueryClient();

    // Active people-review mode — resolved first so the per-person queries below
    // can gate their polling on it. Supervision (department-target role) = read-only
    // "watch": until my_scopes loads, default to view-only so a supervisor never
    // sees an editable flash, and so editors don't poll before their role is known.
    const { data: scopes, isFetching: scopesFetching } = useQuery({
        queryKey: PEOPLE_REVIEW_MY_SCOPES_QK,
        queryFn: fetchMyScopes,
        staleTime: 60_000,
    });
    const activeRoleId = scopes?.active.process_role_id ?? null;
    const activeRole = scopes?.roles.find((r) => r.process_role_id === activeRoleId) ?? null;
    const isSupervision = activeRole?.link_target === 'department';
    const viewOnly = isSupervision || !scopes;

    const { data: rseDetail, isLoading: rseLoading } = useQuery({
        queryKey: ['rse_detail', sid, eid],
        queryFn: () => fetchRSEBySessionEmployee(sid, eid),
        staleTime: 30_000,
        enabled: !!sid && !!eid,
        // Out-of-scope employees 404 by design (scope guard). Don't retry — 3
        // retries just repeat the same 404 and delay the realign redirect.
        retry: false,
    });
    // Flat rse id, resolved from (session, employee). Everything keys off it
    // exactly as before; 0 until the detail loads, so dependent queries stay gated.
    const rid = rseDetail?.id ?? 0;

    // Fetch sibling employees for prev/next navigation. Keyed by the URL session
    // id — NOT rseDetail.session_id: after a scope/department switch the detail
    // for the URL employee 404s (out of the new scope), and a roster gated on the
    // detail would never load, leaving the page dead-ended with no realign.
    const sessionId = sid;
    const { data: siblings = [], isFetching: siblingsFetching } = useQuery({
        queryKey: ['session_employees', sessionId],
        queryFn: () => fetchSessionEmployees(sessionId),
        staleTime: 30_000,
        enabled: !!sessionId,
    });

    const { data: evaluations = [], isLoading: evalLoading } = useQuery({
        queryKey: ['evaluations', rid],
        queryFn: () => fetchEvaluations(rid),
        staleTime: 30_000,
        enabled: !!rid,
    });

    // Background warm-up of the other in-scope employees (arrow order), gated by
    // the `people_review_prefetch_employees` setting. Starts only once the
    // current employee's evaluations have landed so it never competes with the
    // visible load, and pauses while the scope/roster is switching.
    useSiblingPrefetch({
        sid,
        currentEid: eid,
        siblings,
        ready: !!rid && !evalLoading,
        paused: scopesFetching || siblingsFetching,
    });

    // --- Foreign languages ---
    const employeeId = rseDetail?.employee_id;
    const { data: langLevels = [] } = useQuery({
        queryKey: ['language_levels'],
        queryFn: fetchLanguageLevels,
        staleTime: 5 * 60_000,
    });
    const { data: langProfile, isLoading: langLoading } = useQuery({
        queryKey: ['employee_language_profile', employeeId],
        queryFn: () => fetchEmployeeLanguageProfile(employeeId!),
        staleTime: 30_000,
        enabled: !!employeeId,
    });

    // --- Reviewer notes (comments) ---
    // Count drives the header chip badge; the drawer re-fetches its own full list.
    const { data: comments = [] } = useQuery({
        queryKey: ['review_comments', rid],
        queryFn: () => fetchReviewComments(rid),
        enabled: !!rid,
        staleTime: 15_000,
    });

    // --- Competency levels ---
    // Active live levels — drive the employee's current/base level (the base is
    // PERSISTED to employee.current_level_id, so it must stay active-only).
    const { data: allLevels = [] } = useQuery({
        queryKey: ['review_levels', 'active'],
        queryFn: () => fetchReviewLevels(true),
        staleTime: 5 * 60_000,
    });
    // The session's FROZEN levels for this review: counts the proposed level's
    // requirements for the Mark-reviewed gate AND resolves a later-deactivated
    // proposed/current level's name/sort_order.
    const { data: sessionLevels = [] } = useQuery({
        queryKey: ['session_levels', rid],
        queryFn: () => fetchSessionLevels(rid),
        enabled: !!rid,
        staleTime: 5 * 60_000,
    });
    // Saved proposed level — shares the drawer's query key, so saving in the
    // drawer (which invalidates it) refreshes the name shown on the button.
    const { data: proposedLevel } = useQuery({
        queryKey: ['proposed_level', rid],
        queryFn: () => fetchProposedLevel(rid),
        enabled: !!rid,
        staleTime: 30_000,
    });

    // On-demand refresh for the read-only/supervisor view (replaces the old 30s
    // auto-poll). Invalidates only THIS person's mutable queries.
    const [refreshing, setRefreshing] = useState(false);
    const refreshPersonData = async () => {
        setRefreshing(true);
        try {
            await Promise.all([
                qc.invalidateQueries({ queryKey: ['rse_detail', sid, eid] }),
                qc.invalidateQueries({ queryKey: ['evaluations', rid] }),
                qc.invalidateQueries({ queryKey: ['employee_language_profile', employeeId] }),
                qc.invalidateQueries({ queryKey: ['review_comments', rid] }),
                qc.invalidateQueries({ queryKey: ['proposed_level', rid] }),
            ]);
        } finally {
            setRefreshing(false);
        }
    };

    // After a scope/department switch the URL employee is usually NOT in the newly
    // scoped sibling list. Realign to the FIRST employee of the new scope.
    //
    // `realignTargetId` is a PRIMITIVE (number | null). The redirect runs in an
    // effect keyed on that primitive + `eid` — NOT rendered as <Navigate> during
    // render, and NOT keyed on the `siblings` array (whose identity churns on
    // every refetch). Once the redirect lands, `eid` becomes the target, the target
    // is now in `siblings`, so `realignTargetId` flips to null — loop-proof.
    const realignTargetId =
        !siblingsFetching && siblings.length > 0 && !siblings.some(s => s.employee_id === eid)
            ? siblings[0].employee_id
            : null;
    useEffect(() => {
        if (realignTargetId != null && realignTargetId !== eid) {
            navigate({
                to: '/people_review/$sessionId/employee/$employeeId',
                params: { sessionId: String(sid), employeeId: String(realignTargetId) },
                replace: true,
            });
        }
    }, [realignTargetId, eid, sid, navigate]);

    return {
        scopes, scopesFetching, activeRoleId, activeRole, isSupervision, viewOnly,
        rseDetail, rseLoading, rid, sessionId,
        siblings, siblingsFetching,
        evaluations, evalLoading,
        langLevels, employeeId, langProfile, langLoading,
        comments, allLevels, sessionLevels, proposedLevel,
        refreshPersonData, refreshing, realignTargetId,
    };
}

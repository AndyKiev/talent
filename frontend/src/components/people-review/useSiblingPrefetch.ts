// Background warm-up of the OTHER employees in the viewer's scope on the
// evaluation page. Gated by the `people_review_prefetch_employees` setting
// (per-user overridable): when on, once the CURRENT employee is loaded, the
// per-employee queries of the NEXT siblings are prefetched into the TanStack
// Query cache one employee at a time, in the same order the prev/next arrows
// walk, so switching (arrows or the employee select) renders instantly from
// cache. The queue is capped by the app-only
// `people_review_prefetch_max_employees` setting (0 = warm-up off) so a large
// scope never floods the browser/backend. Cache-only writes — the current
// employee's draft/edits are never touched.
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
    fetchRSEBySessionEmployee,
    fetchEvaluations,
    fetchEmployeeLanguageProfile,
    fetchReviewComments,
    fetchProposedLevel,
    fetchSessionLevels,
    fetchEmployeeEducations,
    fetchEmployeeChildren,
    type ReviewSessionEmployeeList,
} from './peopleReviewApi';
import { fetchEmployeeTrainings } from '../employees/trainings/employeeTrainingApi';
import { fetchEligibleTrainingTypes } from '../training/training_types/trainingTypeApi';
import { fetchEmployeePhotoBlob } from '../../api/employeePhotoApi';
import { EMPLOYEE_TRAININGS_QK, TRAINING_TYPES_ELIGIBLE_QK } from '../../utils/queryKeys';
import {
    useBooleanSetting,
    useEffectiveBooleanSetting,
    useIntegerSetting,
} from '../../hooks/useAppSetting';

// Prefetched entries stay "fresh enough" for the prefetcher itself for this
// long, so walking employees doesn't re-download the whole scope on every
// navigation. The page's own queries keep their shorter staleTime and still
// background-refresh on mount — the user sees cached data instantly.
const PREFETCH_STALE = 5 * 60_000;

// Grace period before the walk starts. Lets the current employee's own
// remaining requests (tabs, photo, comments) win the browser's connection
// pool first, and coalesces rapid arrow-clicking into one walk.
const START_DELAY_MS = 1_500;

export function useSiblingPrefetch({
    sid,
    currentEid,
    siblings,
    ready,
    paused = false,
}: {
    sid: number;
    /** The employee currently on screen (URL param) — excluded from the warm-up. */
    currentEid: number;
    /** Scope-filtered sibling list, already in arrow order. */
    siblings: ReviewSessionEmployeeList[];
    /** Start only when the current employee's own data has landed. */
    ready: boolean;
    /** Halt while the scope/roster is being switched (mode/department change,
     *  roster refetch): warming the OLD scope's employees mid-switch just 404s
     *  against the new context. The walk restarts when the refetch settles. */
    paused?: boolean;
}) {
    const qc = useQueryClient();
    const { enabled: prefetchEnabled } = useBooleanSetting('people_review_prefetch_employees');
    const { enabled: photosEnabled } = useEffectiveBooleanSetting('employee_photos_people_review');
    const { value: maxAhead } = useIntegerSetting('people_review_prefetch_max_employees', 5);

    // Restart the walk only when the actual order/position changes, not on
    // every refetch that returns a new array reference with the same content.
    const orderKey = siblings.map((s) => s.employee_id).join(',');

    useEffect(() => {
        if (!prefetchEnabled || !ready || paused || !sid || !currentEid || maxAhead <= 0) return;
        const ids = orderKey ? orderKey.split(',').map(Number) : [];
        if (ids.length < 2) return;
        const cur = ids.indexOf(currentEid);
        // Current employee not in the list (scope just switched) — the page is
        // about to realign to the first in-scope employee; don't warm a stale
        // position, the effect re-runs after the redirect.
        if (cur === -1) return;

        // Arrow order ahead of the current employee, wrapping around to the
        // start (the select can jump anywhere), capped by the queue setting.
        const queue = [...ids.slice(cur + 1), ...ids.slice(0, cur)].slice(0, maxAhead);
        if (queue.length === 0) return;

        let cancelled = false;

        const walk = async () => {
            for (const eid of queue) {
                if (cancelled) return;
                try {
                    // The detail resolves the flat rse id everything else keys off.
                    const detail = await qc.fetchQuery({
                        queryKey: ['rse_detail', sid, eid],
                        queryFn: () => fetchRSEBySessionEmployee(sid, eid),
                        staleTime: PREFETCH_STALE,
                        retry: false,
                    });
                    if (cancelled) return;
                    const rid = detail.id;
                    const employeeId = detail.employee_id;
                    const prefetch = <T,>(queryKey: readonly unknown[], queryFn: () => Promise<T>) =>
                        qc.prefetchQuery({ queryKey, queryFn, staleTime: PREFETCH_STALE, retry: false });
                    // All endpoints of ONE employee finish before the next
                    // employee starts, so a warmed employee always renders whole.
                    await Promise.allSettled([
                        prefetch(['evaluations', rid], () => fetchEvaluations(rid)),
                        prefetch(['review_comments', rid], () => fetchReviewComments(rid)),
                        prefetch(['proposed_level', rid], () => fetchProposedLevel(rid)),
                        prefetch(['session_levels', rid], () => fetchSessionLevels(rid)),
                        prefetch(['employee_language_profile', employeeId], () => fetchEmployeeLanguageProfile(employeeId)),
                        prefetch(['employee_educations', employeeId], () => fetchEmployeeEducations(employeeId)),
                        prefetch(['employee_children', employeeId], () => fetchEmployeeChildren(employeeId)),
                        prefetch(EMPLOYEE_TRAININGS_QK(employeeId), () => fetchEmployeeTrainings(employeeId)),
                        prefetch(TRAINING_TYPES_ELIGIBLE_QK(employeeId), () => fetchEligibleTrainingTypes(employeeId)),
                        ...(photosEnabled
                            ? [prefetch(['employee_photo', employeeId], () => fetchEmployeePhotoBlob(employeeId))]
                            : []),
                    ]);
                } catch {
                    // Unreachable sibling (403/404/network) — skip, keep warming the rest.
                }
            }
        };

        const timer = window.setTimeout(() => { void walk(); }, START_DELAY_MS);
        return () => {
            cancelled = true;
            window.clearTimeout(timer);
        };
    }, [prefetchEnabled, photosEnabled, maxAhead, ready, paused, sid, currentEid, orderKey, qc]);
}

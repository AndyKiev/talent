import { useEffect, type Dispatch, type SetStateAction } from 'react';
import type { GetStringFn } from '../../../../types/getStringFn';
import type {
    Evaluation,
    ReviewSessionEmployee,
    EmployeeLanguageProfile,
    RseDimensionType,
} from '../../peopleReviewApi';
import {
    usePeopleReviewStore,
    buildEvaluationDraft,
    EMPTY_EVAL_DRAFT,
    type EvaluationDraft,
} from '../../peopleReviewStore';

interface Args {
    rid: number;
    rseDetail: ReviewSessionEmployee | undefined;
    rseLoading: boolean;
    evaluations: Evaluation[];
    evalLoading: boolean;
    employeeId: number | undefined;
    langProfile: EmployeeLanguageProfile | undefined;
    langLoading: boolean;
    viewOnly: boolean;
    getString: GetStringFn;
    /** The summary's sides — needed to split the flat summary list into the two
     *  draft slices. Hydration waits for them (see hydrationReady). */
    dimensionTypes: RseDimensionType[];
}

/**
 * Owns the per-rseId editable draft (zustand). All unsaved edits live in the
 * store so navigating between employees / pages doesn't lose them. Exposes the
 * `draft` (with a stable frozen sentinel until hydrated), the field setters (with
 * the React `useState` dispatch signature so existing `setX(prev => ...)` handlers
 * keep working), and `hydrationReady`. The two hydration effects (editable +
 * view-only) live here with their original dependency arrays preserved.
 */
export function useEvaluationDraft({
    rid, rseDetail, rseLoading, evaluations, evalLoading,
    employeeId, langProfile, langLoading, viewOnly, getString, dimensionTypes,
}: Args) {
    const storeDraft = usePeopleReviewStore((s) => s.evalDrafts[rid]);
    const hydrateEvalDraft = usePeopleReviewStore((s) => s.hydrateEvalDraft);
    const updateEvalDraft = usePeopleReviewStore((s) => s.updateEvalDraft);
    const draft = storeDraft ?? EMPTY_EVAL_DRAFT;

    // Field setters with the React `useState` dispatch signature so the existing
    // handlers can keep using `setX(prev => ...)` unchanged — each writes back
    // into the store draft for the current rseId.
    function makeSetter<K extends keyof EvaluationDraft>(key: K): Dispatch<SetStateAction<EvaluationDraft[K]>> {
        return (action) =>
            updateEvalDraft(rid, (d) => ({
                ...d,
                [key]: typeof action === 'function'
                    ? (action as (prev: EvaluationDraft[K]) => EvaluationDraft[K])(d[key])
                    : action,
            }));
    }
    const setLocalEvals = makeSetter('localEvals');
    const setLangSel = makeSetter('langSel');
    const setEmployeeFeedback = makeSetter('employeeFeedback');
    const setManagerFeedback = makeSetter('managerFeedback');
    const setResults = makeSetter('results');
    const setStrongOptions = makeSetter('strongOptions');
    const setDevelopOptions = makeSetter('developOptions');
    const setStrongDrafts = makeSetter('strongDrafts');
    const setDevelopDrafts = makeSetter('developDrafts');
    const setSummaryFullCompetenceList = makeSetter('summaryFullCompetenceList');

    // Hydrate the draft as soon as data for this rseId EXISTS — first-load flags,
    // not isFetching: prefetched/cached data renders the full page instantly while
    // any 30s-stale background refresh completes silently (a switch to a warmed
    // sibling must not blank the lower tabs until the refetch settles).
    // dimensionTypes is part of the gate: without the side rows the summary list
    // cannot be split into its two draft slices, and hydrating early would show
    // an empty summary that autosave could then persist over the real one.
    const hydrationReady =
        !!rseDetail && !rseLoading && !evalLoading && dimensionTypes.length > 0 &&
        (!employeeId || (langProfile !== undefined && !langLoading));

    // Editable path: skipped when a draft already exists, so in-progress edits survive
    // navigating away and back (the draft is the live source; autosave keeps it).
    useEffect(() => {
        if (viewOnly) return; // view-only re-hydration is handled separately below
        if (!hydrationReady || !rseDetail || storeDraft) return;
        hydrateEvalDraft(rid, buildEvaluationDraft(rseDetail, evaluations, langProfile, getString, dimensionTypes));
    }, [viewOnly, hydrationReady, storeDraft, rid, rseDetail, evaluations, langProfile, getString, dimensionTypes, hydrateEvalDraft]);

    // Supervision (view-only) is a passive watch with NO local edits, so we keep the
    // draft in lock-step with the polled server data: re-hydrate whenever it changes.
    // Deps deliberately exclude `storeDraft` (re-hydrating mutates it) — React Query's
    // structural sharing keeps rseDetail/evaluations/langProfile references stable on
    // no-op refetches, so this only fires on a real change, not on every render.
    useEffect(() => {
        if (!viewOnly || !hydrationReady || !rseDetail) return;
        hydrateEvalDraft(rid, buildEvaluationDraft(rseDetail, evaluations, langProfile, getString, dimensionTypes));
    }, [viewOnly, hydrationReady, rid, rseDetail, evaluations, langProfile, getString, dimensionTypes, hydrateEvalDraft]);

    return {
        storeDraft, draft, updateEvalDraft, hydrationReady,
        setLocalEvals, setLangSel, setEmployeeFeedback, setManagerFeedback,
        setResults,
        setStrongOptions, setDevelopOptions, setStrongDrafts, setDevelopDrafts,
        setSummaryFullCompetenceList,
    };
}

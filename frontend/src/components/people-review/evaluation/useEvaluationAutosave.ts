import { useCallback, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
    bulkUpdateEvaluations,
    saveRSEFields,
    saveRseDimensions,
    saveRseResults,
    saveRseFeedbacks,
    saveEmployeeLanguageProfile,
    type EvaluationBulkUpdate,
    type CriterionScore,
    type RSEFieldsUpdate,
    type EmployeeLanguageInput,
    type RseDimensionType,
    type RseDimensionInput,
    type RseResultInput,
    type RseFeedbackInput,
    type RseFeedbackType,
} from '../peopleReviewApi';
import {
    serializeFacts,
    FOREIGN_LANGUAGES,
    DimensionSide,
    type DimensionOption,
} from './evaluationHelpers';
import {
    RSE_FEEDBACK_EMPLOYEE,
    RSE_FEEDBACK_MANAGER,
    type EvaluationDraft,
} from '../peopleReviewStore';

// Background autosave for the evaluation draft. Replaces the manual Save button:
// every editable change (competence scores/facts/improvements, RSE text fields,
// foreign-language levels) is pushed to the server ~700ms after the last edit,
// reusing the same three bulk endpoints the old Save button called.
//
// The draft is the live source of truth and is NEVER cleared/re-hydrated here —
// displayed scores are derived client-side (evalMean/evalFilled), so there is no
// need to round-trip, and re-hydrating mid-edit would clobber the feedback inputs.
//
// Prev/next navigation changes `rid` WITHOUT unmounting this component, so a timer
// scheduled for employee A must not write A's data to B. Every pending save snapshot
// captures its own rid/employeeId, and the outgoing rid is flushed on rid change.

export type AutosaveStatus = 'idle' | 'saving' | 'saved' | 'error';

const DEBOUNCE_MS = 700;
const RETRY_MS = 4000;

interface PendingSnapshot {
    rid: number;
    employeeId: number | null;
    evals: EvaluationBulkUpdate[] | null;
    rseFields: RSEFieldsUpdate | null;
    langs: EmployeeLanguageInput[] | null;
    // Null unless the feedback itself changed — an unrelated edit must not
    // rewrite those rows.
    feedbacks: RseFeedbackInput[] | null;
    // Null unless the results list itself changed — an unrelated edit must not
    // issue a PUT that deletes and reinserts those rows.
    results: RseResultInput[] | null;
    // Null unless the singled-out dimensions themselves changed — an unrelated
    // edit must not issue a PUT that deletes and reinserts those rows.
    dimensions: RseDimensionInput[] | null;
}

interface Baseline {
    rid: number;
    evals: string;
    rseFields: string;
    langs: string;
    feedbacks: string;
    results: string;
    dimensions: string;
}

function buildEvalUpdates(localEvals: EvaluationDraft['localEvals']): EvaluationBulkUpdate[] {
    return localEvals.map((le) => {
        const criterion_scores: CriterionScore[] = [];
        le.descriptors.forEach((_, i) => {
            const s = le.criterionScores[i];
            if (s != null) criterion_scores.push({ criterion_index: i, score: s });
        });
        return {
            id: le.id,
            facts: serializeFacts(le.facts) || null,
            improvement: serializeFacts(le.improvements) || null,
            criterion_scores,
        };
    });
}

function buildRseFields(d: EvaluationDraft): RSEFieldsUpdate {
    return {
        summary_full_competence_list: d.summaryFullCompetenceList,
    };
}

/**
 * The singled-out dimensions as the flat, type-driven payload the PUT expects. Both
 * sides in one list, each item carrying the id of its side — so the request body
 * never names a side, and the array order becomes the stored sort_order.
 *
 * Returns null while the type lookup hasn't loaded: without those ids there is
 * nothing meaningful to send, and skipping keeps the baseline undirty so the
 * save fires as soon as they arrive.
 */
function buildDimensionItems(
    d: EvaluationDraft,
    dimensionTypes: RseDimensionType[],
): RseDimensionInput[] | null {
    const idOf = (key: DimensionSide) => dimensionTypes.find(t => t.key === key)?.id;
    const strongId = idOf(DimensionSide.Strong);
    const developId = idOf(DimensionSide.Develop);
    if (strongId == null || developId == null) return null;
    const side = (typeId: number, options: DimensionOption[]) =>
        options.map(o => ({
            review_session_employee_dimension_type_id: typeId,
            dimension_id: o.dimension_id,
            comments: o.comments,
        }));
    return [...side(strongId, d.strongOptions), ...side(developId, d.developOptions)];
}

/**
 * The two feedback boxes as the PUT's payload, each carrying its VOICE id.
 * Blank text is still sent — the server reads that as "delete this voice's row",
 * which is how clearing a box works now that absence is the empty state.
 *
 * Returns null until the type lookup has loaded: without those ids there is
 * nothing meaningful to send, and skipping keeps the baseline undirty so the
 * save fires as soon as they arrive.
 */
function buildFeedbackItems(
    d: EvaluationDraft,
    feedbackTypes: RseFeedbackType[],
): RseFeedbackInput[] | null {
    const idOf = (key: string) => feedbackTypes.find(t => t.key === key)?.id;
    const employeeId = idOf(RSE_FEEDBACK_EMPLOYEE);
    const managerId = idOf(RSE_FEEDBACK_MANAGER);
    if (employeeId == null || managerId == null) return null;
    return [
        { review_session_employee_feedback_type_id: employeeId, text: d.employeeFeedback },
        { review_session_employee_feedback_type_id: managerId, text: d.managerFeedback },
    ];
}

/** The results as the PUT's payload: text only, position from the array order. */
function buildResultItems(d: EvaluationDraft): RseResultInput[] {
    return d.results.filter(t => t.trim()).map(text => ({ text }));
}

function buildLangs(d: EvaluationDraft): EmployeeLanguageInput[] {
    return FOREIGN_LANGUAGES.map(({ key }) => ({ language: key, level_id: d.langSel[key] ?? null }));
}

interface Params {
    rid: number;
    employeeId: number | null;
    sessionId: number | undefined;
    /** editable && !viewOnly && draft hydrated — autosave is inert when false. */
    enabled: boolean;
    draft: EvaluationDraft;
    /** The sides, from the DB lookup — supplies each item's type id. */
    dimensionTypes: RseDimensionType[];
    /** The feedback voices, from the DB lookup — supplies each box's type id. */
    feedbackTypes: RseFeedbackType[];
    onError: (message: string) => void;
}

interface Result {
    status: AutosaveStatus;
    /** Resolve once any pending/in-flight save has settled (used before Mark reviewed). */
    flush: () => Promise<void>;
}

export function useEvaluationAutosave({
    rid, employeeId, sessionId, enabled, draft, dimensionTypes, feedbackTypes, onError,
}: Params): Result {
    const qc = useQueryClient();
    const [status, setStatus] = useState<AutosaveStatus>('idle');

    const pendingRef = useRef<PendingSnapshot | null>(null);
    const baselineRef = useRef<Baseline | null>(null);
    const lastSigRef = useRef<string | null>(null);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const retryRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const inFlightRef = useRef<Promise<void> | null>(null);

    // Latest props read by stable callbacks without widening their deps.
    // Synced in an effect (React 19 forbids ref writes during render). This
    // effect is declared BEFORE every effect that reads the refs, so within a
    // commit the refs are always fresh by the time a reader runs; the async
    // callbacks (timers, saves) run later still.
    const draftRef = useRef(draft);
    const onErrorRef = useRef(onError);
    const sessionIdRef = useRef(sessionId);
    const dimensionTypesRef = useRef(dimensionTypes);
    const feedbackTypesRef = useRef(feedbackTypes);
    // Self-reference handle for the retry/follow-up timers scheduled INSIDE
    // runSave (a direct `runSave` reference there is a use-before-declaration).
    const runSaveRef = useRef<(() => Promise<void>) | null>(null);
    useEffect(() => {
        draftRef.current = draft;
        onErrorRef.current = onError;
        sessionIdRef.current = sessionId;
        dimensionTypesRef.current = dimensionTypes;
        feedbackTypesRef.current = feedbackTypes;
    });

    const clearTimer = () => {
        if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    };

    // Fire whatever is pending against its CAPTURED rid/employeeId. Returns a
    // promise that settles when the round-trip finishes; serialized via inFlightRef.
    const runSave = useCallback(async (): Promise<void> => {
        clearTimer();
        if (inFlightRef.current) { await inFlightRef.current; return; }
        const pend = pendingRef.current;
        if (!pend) return;
        pendingRef.current = null;
        setStatus('saving');

        const work = (async () => {
            const tasks: Promise<unknown>[] = [];
            if (pend.evals) tasks.push(bulkUpdateEvaluations(pend.evals));
            if (pend.rseFields) tasks.push(saveRSEFields(pend.rid, pend.rseFields));
            if (pend.feedbacks) tasks.push(saveRseFeedbacks(pend.rid, pend.feedbacks));
            if (pend.results) tasks.push(saveRseResults(pend.rid, pend.results));
            if (pend.dimensions) tasks.push(saveRseDimensions(pend.rid, pend.dimensions));
            if (pend.langs && pend.employeeId != null) {
                tasks.push(saveEmployeeLanguageProfile(pend.employeeId, pend.langs));
            }
            try {
                await Promise.all(tasks);
                // Advance the saved-state baseline only while still on the same record.
                if (baselineRef.current && baselineRef.current.rid === pend.rid) {
                    if (pend.evals) baselineRef.current.evals = JSON.stringify(pend.evals);
                    if (pend.rseFields) baselineRef.current.rseFields = JSON.stringify(pend.rseFields);
                    if (pend.feedbacks) baselineRef.current.feedbacks = JSON.stringify(pend.feedbacks);
                    if (pend.results) baselineRef.current.results = JSON.stringify(pend.results);
                    if (pend.dimensions) baselineRef.current.dimensions = JSON.stringify(pend.dimensions);
                    if (pend.langs) baselineRef.current.langs = JSON.stringify(pend.langs);
                }
                if (sessionIdRef.current) {
                    void qc.invalidateQueries({ queryKey: ['session_employees', sessionIdRef.current] });
                }
                setStatus(pendingRef.current ? 'saving' : 'saved');
            } catch (err) {
                // Keep the failed payload so the next edit / retry resends it; if a newer
                // snapshot was queued meanwhile it already supersedes this one.
                pendingRef.current = pendingRef.current ?? pend;
                setStatus('error');
                onErrorRef.current(err instanceof Error ? err.message : String(err));
                if (retryRef.current) clearTimeout(retryRef.current);
                retryRef.current = setTimeout(() => { void runSaveRef.current?.(); }, RETRY_MS);
            } finally {
                inFlightRef.current = null;
            }
        })();
        inFlightRef.current = work;
        await work;
        // A change landed during the save — schedule a follow-up flush.
        if (pendingRef.current && !timerRef.current) {
            timerRef.current = setTimeout(() => { void runSaveRef.current?.(); }, 0);
        }
    }, [qc]);

    // Keep the self-reference handle current (runSave is identity-stable — its
    // only dep is the stable query client — so this never changes in practice).
    useEffect(() => {
        runSaveRef.current = runSave;
    }, [runSave]);

    // Detect dirty draft vs the saved baseline and (re)arm the debounce timer.
    useEffect(() => {
        if (!enabled) return;
        const base = baselineRef.current;
        if (!base || base.rid !== rid) return; // baseline not established for this rid yet

        const evals = buildEvalUpdates(draft.localEvals);
        const rseFields = buildRseFields(draft);
        const langs = buildLangs(draft);
        const feedbacks = buildFeedbackItems(draft, feedbackTypes);
        const results = buildResultItems(draft);
        const dimensions = buildDimensionItems(draft, dimensionTypes);
        const evalsStr = JSON.stringify(evals);
        const rseStr = JSON.stringify(rseFields);
        const langStr = JSON.stringify(langs);
        const feedbacksStr = JSON.stringify(feedbacks);
        const resultsStr = JSON.stringify(results);
        const dimensionsStr = JSON.stringify(dimensions);

        const evalsDirty = evalsStr !== base.evals;
        const rseDirty = rseStr !== base.rseFields;
        const langDirty = employeeId != null && langStr !== base.langs;
        const feedbacksDirty = feedbacks != null && feedbacksStr !== base.feedbacks;
        const resultsDirty = resultsStr !== base.results;
        const dimensionsDirty = dimensions != null && dimensionsStr !== base.dimensions;
        if (!evalsDirty && !rseDirty && !langDirty && !feedbacksDirty && !resultsDirty && !dimensionsDirty) return;

        const sig = `${evalsStr}|${rseStr}|${langStr}|${feedbacksStr}|${resultsStr}|${dimensionsStr}`;
        if (sig === lastSigRef.current) return; // identical dirty state already queued
        lastSigRef.current = sig;

        const prev = pendingRef.current?.rid === rid ? pendingRef.current : null;
        pendingRef.current = {
            rid,
            employeeId,
            evals: evalsDirty ? evals : prev?.evals ?? null,
            rseFields: rseDirty ? rseFields : prev?.rseFields ?? null,
            langs: langDirty ? langs : prev?.langs ?? null,
            feedbacks: feedbacksDirty ? feedbacks : prev?.feedbacks ?? null,
            results: resultsDirty ? results : prev?.results ?? null,
            dimensions: dimensionsDirty ? dimensions : prev?.dimensions ?? null,
        };
        setStatus('saving');
        clearTimer();
        timerRef.current = setTimeout(() => { void runSave(); }, DEBOUNCE_MS);
    }, [enabled, rid, employeeId, draft, dimensionTypes, feedbackTypes, runSave]);

    // Seed the visible status whenever the record or editability changes —
    // adjust-during-render; the baseline itself is re-established in the effect
    // below (same [enabled, rid] trigger, so the two stay in lock-step).
    // prev starts null so an already-enabled first render seeds 'saved' exactly
    // like the old on-mount effect did.
    const statusSeedKey = enabled ? String(rid) : null;
    const [prevStatusSeedKey, setPrevStatusSeedKey] = useState<string | null>(null);
    if (statusSeedKey !== prevStatusSeedKey) {
        setPrevStatusSeedKey(statusSeedKey);
        if (statusSeedKey !== null) setStatus('saved');
    }

    // Establish (and reset) the baseline when the record or editability changes.
    // The cleanup flushes the OUTGOING record before the baseline is replaced, so a
    // pending edit is never silently dropped or written to the next employee.
    useEffect(() => {
        if (!enabled) return;
        const d = draftRef.current;
        baselineRef.current = {
            rid,
            evals: JSON.stringify(buildEvalUpdates(d.localEvals)),
            rseFields: JSON.stringify(buildRseFields(d)),
            langs: JSON.stringify(buildLangs(d)),
            feedbacks: JSON.stringify(buildFeedbackItems(d, feedbackTypesRef.current)),
            results: JSON.stringify(buildResultItems(d)),
            dimensions: JSON.stringify(buildDimensionItems(d, dimensionTypesRef.current)),
        };
        lastSigRef.current = null;
        return () => {
            clearTimer();
            if (retryRef.current) { clearTimeout(retryRef.current); retryRef.current = null; }
            const pend = pendingRef.current;
            if (!pend) return;
            pendingRef.current = null;
            // Fire-and-forget against captured ids — we are leaving this record.
            if (pend.evals) void bulkUpdateEvaluations(pend.evals).catch(() => {});
            if (pend.rseFields) void saveRSEFields(pend.rid, pend.rseFields).catch(() => {});
            if (pend.feedbacks) void saveRseFeedbacks(pend.rid, pend.feedbacks).catch(() => {});
            if (pend.results) void saveRseResults(pend.rid, pend.results).catch(() => {});
            if (pend.dimensions) void saveRseDimensions(pend.rid, pend.dimensions).catch(() => {});
            if (pend.langs && pend.employeeId != null) {
                void saveEmployeeLanguageProfile(pend.employeeId, pend.langs).catch(() => {});
            }
        };
    }, [enabled, rid]);

    const flush = useCallback(async () => {
        clearTimer();
        if (retryRef.current) { clearTimeout(retryRef.current); retryRef.current = null; }
        // Two passes: drain an in-flight save, fire whatever is still pending, then
        // catch anything queued during that save. Best-effort — a failed save leaves
        // the error state rather than looping (the caller proceeds; the server
        // re-validates from whatever persisted).
        if (inFlightRef.current) await inFlightRef.current;
        await runSave();
        if (inFlightRef.current) await inFlightRef.current;
    }, [runSave]);

    return { status, flush };
}

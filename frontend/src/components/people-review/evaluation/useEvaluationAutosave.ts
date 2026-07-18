import { useCallback, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
    bulkUpdateEvaluations,
    saveRSEFields,
    saveEmployeeLanguageProfile,
    type EvaluationBulkUpdate,
    type CriterionScore,
    type RSEFieldsUpdate,
    type EmployeeLanguageInput,
} from '../peopleReviewApi';
import { serializeFacts, serializeMissions, FOREIGN_LANGUAGES } from './evaluationHelpers';
import type { EvaluationDraft } from '../peopleReviewStore';

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
}

interface Baseline {
    rid: number;
    evals: string;
    rseFields: string;
    langs: string;
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
    const hasMissions = d.missions.some((m) => m.text.trim());
    const hasSummary = d.strongOptions.length > 0 || d.developOptions.length > 0;
    return {
        employee_feedback: d.employeeFeedback || null,
        manager_feedback: d.managerFeedback || null,
        results_achievements: serializeFacts(d.results) || null,
        development_plan: hasMissions ? serializeMissions(d.missions) : null,
        trainings: d.trainings || null,
        competence_summary: hasSummary
            ? JSON.stringify({ strong: d.strongOptions, develop: d.developOptions })
            : null,
        summary_full_competence_list: d.summaryFullCompetenceList,
    };
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
    onError: (message: string) => void;
}

interface Result {
    status: AutosaveStatus;
    /** Resolve once any pending/in-flight save has settled (used before Mark reviewed). */
    flush: () => Promise<void>;
}

export function useEvaluationAutosave({
    rid, employeeId, sessionId, enabled, draft, onError,
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
    // Self-reference handle for the retry/follow-up timers scheduled INSIDE
    // runSave (a direct `runSave` reference there is a use-before-declaration).
    const runSaveRef = useRef<(() => Promise<void>) | null>(null);
    useEffect(() => {
        draftRef.current = draft;
        onErrorRef.current = onError;
        sessionIdRef.current = sessionId;
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
            if (pend.langs && pend.employeeId != null) {
                tasks.push(saveEmployeeLanguageProfile(pend.employeeId, pend.langs));
            }
            try {
                await Promise.all(tasks);
                // Advance the saved-state baseline only while still on the same record.
                if (baselineRef.current && baselineRef.current.rid === pend.rid) {
                    if (pend.evals) baselineRef.current.evals = JSON.stringify(pend.evals);
                    if (pend.rseFields) baselineRef.current.rseFields = JSON.stringify(pend.rseFields);
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
        const evalsStr = JSON.stringify(evals);
        const rseStr = JSON.stringify(rseFields);
        const langStr = JSON.stringify(langs);

        const evalsDirty = evalsStr !== base.evals;
        const rseDirty = rseStr !== base.rseFields;
        const langDirty = employeeId != null && langStr !== base.langs;
        if (!evalsDirty && !rseDirty && !langDirty) return;

        const sig = `${evalsStr}|${rseStr}|${langStr}`;
        if (sig === lastSigRef.current) return; // identical dirty state already queued
        lastSigRef.current = sig;

        const prev = pendingRef.current?.rid === rid ? pendingRef.current : null;
        pendingRef.current = {
            rid,
            employeeId,
            evals: evalsDirty ? evals : prev?.evals ?? null,
            rseFields: rseDirty ? rseFields : prev?.rseFields ?? null,
            langs: langDirty ? langs : prev?.langs ?? null,
        };
        setStatus('saving');
        clearTimer();
        timerRef.current = setTimeout(() => { void runSave(); }, DEBOUNCE_MS);
    }, [enabled, rid, employeeId, draft, runSave]);

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

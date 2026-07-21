import { useState, type Dispatch, type SetStateAction } from 'react';
import { flipCompetence } from '../../peopleReviewApi';
import type { EvaluationDraft } from '../../peopleReviewStore';
import {
    type SummaryOption,
    CompetenceSide,
    type PendingFlip,
    type LocalEval,
    rankedCompetences,
    detectCompetenceFlip,
} from '../evaluationHelpers';

type SummarySetter = Dispatch<SetStateAction<SummaryOption[]>>;

interface Args {
    rid: number;
    updateEvalDraft: (rid: number, updater: (d: EvaluationDraft) => EvaluationDraft) => void;
    // Draft slices
    localEvals: LocalEval[];
    strongOptions: SummaryOption[];
    developOptions: SummaryOption[];
    // Spine
    visibleEvals: LocalEval[];
    competenceLabel: (key: string) => string;
    isStrongPicked: (key: string) => boolean;
    isDevelopPicked: (key: string) => boolean;
    summaryFullListActive: boolean;
    // Draft setters. The strong-side option setter is applied from the page's JSX
    // via the generic `(setter, ...)` handlers, so only the develop-side setter
    // (used by removeDevelopOption / confirmDevelopRemoval) is needed here.
    setLocalEvals: Dispatch<SetStateAction<LocalEval[]>>;
    setDevelopOptions: SummarySetter;
    setStrongDrafts: Dispatch<SetStateAction<Record<string, string>>>;
    setDevelopDrafts: Dispatch<SetStateAction<Record<string, string>>>;
    setSummaryFullCompetenceList: Dispatch<SetStateAction<boolean>>;
    // Settings + misc
    summaryMinOptions: number;
    flushAutosave: () => Promise<void>;
    setActiveTab: Dispatch<SetStateAction<number>>;
    onError: (message: string) => void;
}

/**
 * Competence-summary orchestration: the strong / to-develop selects, star
 * re-ratings that flip a competence to the opposite list (confirmed atomically),
 * full-list toggle + reconcile, and the linked-comment drafts. Holds the two
 * pending-confirmation states that drive the summary dialogs.
 *
 * Deliberately knows NOTHING about development missions. Missions used to live
 * in this same draft as free-text `dimension_key` strings, so changing the
 * summary had to null out any mission pointing at a dropped competence. They are
 * now employee-owned rows linked to review_dimensions.id, independent of any one
 * session's summary — so a reviewer editing this summary must never silently
 * rewrite the employee's standing development plan.
 */
export function useCompetenceSummary({
    rid, updateEvalDraft,
    localEvals, strongOptions, developOptions,
    visibleEvals, competenceLabel, isStrongPicked, isDevelopPicked, summaryFullListActive,
    setLocalEvals, setDevelopOptions, setStrongDrafts, setDevelopDrafts,
    setSummaryFullCompetenceList,
    summaryMinOptions, flushAutosave, setActiveTab, onError,
}: Args) {
    // A star re-rating held back because it would flip a competence to the
    // opposite summary list — confirmed via a dialog, then applied atomically.
    const [pendingFlip, setPendingFlip] = useState<PendingFlip | null>(null);
    // Turning the full-list switch OFF re-arms ranked selection, so any picked
    // competence that no longer fits its side is re-evaluated and held here.
    const [pendingSummaryReconcile, setPendingSummaryReconcile] =
        useState<{ key: string; name: string; side: CompetenceSide }[] | null>(null);

    // Push a line into the comment-input draft of one summary side. Facts prove
    // STRONG competences, so they copy only into the strong summary; the directions
    // for improvement feed only the to-develop summary. Each side has its own button.
    const appendDraft = (setter: Dispatch<SetStateAction<Record<string, string>>>, key: string, text: string) =>
        setter(prev => ({ ...prev, [key]: prev[key] ? `${prev[key]}\n${text}` : text }));
    const copyFactToStrong = (key: string, text: string) => appendDraft(setStrongDrafts, key, text);
    const copyImprovementToDevelop = (key: string, text: string) => appendDraft(setDevelopDrafts, key, text);

    // Summary select candidates, excluding already-picked ones. Default: the
    // top/bottom scored shortlist; full-list mode: every competence (page order).
    const strongCandidates = (summaryFullListActive ? visibleEvals : rankedCompetences(visibleEvals, 'desc', summaryMinOptions))
        .filter(e => !strongOptions.some(o => o.dimension_key === e.dimension_key))
        .map(e => ({ key: e.dimension_key, name: competenceLabel(e.dimension_key) }));
    const developCandidates = (summaryFullListActive ? visibleEvals : rankedCompetences(visibleEvals, 'asc', summaryMinOptions))
        .filter(e => !developOptions.some(o => o.dimension_key === e.dimension_key))
        .map(e => ({ key: e.dimension_key, name: competenceLabel(e.dimension_key) }));

    // Picked competences that no longer belong in their summary side by the current
    // scores (used when leaving full-list mode).
    const computeMisplacedSummary = (): { key: string; name: string; side: CompetenceSide }[] => {
        const strongKeys = new Set(rankedCompetences(visibleEvals, 'desc', summaryMinOptions).map(e => e.dimension_key));
        const developKeys = new Set(rankedCompetences(visibleEvals, 'asc', summaryMinOptions).map(e => e.dimension_key));
        const out: { key: string; name: string; side: CompetenceSide }[] = [];
        for (const o of strongOptions) {
            if (developKeys.has(o.dimension_key) && !strongKeys.has(o.dimension_key)) {
                out.push({ key: o.dimension_key, name: competenceLabel(o.dimension_key), side: CompetenceSide.Strong });
            }
        }
        for (const o of developOptions) {
            if (strongKeys.has(o.dimension_key) && !developKeys.has(o.dimension_key)) {
                out.push({ key: o.dimension_key, name: competenceLabel(o.dimension_key), side: CompetenceSide.Develop });
            }
        }
        return out;
    };

    // The full-list switch. Turning ON is always safe. Turning OFF re-arms ranked
    // selection: if any pick is now misplaced, hold the toggle and confirm removal.
    const handleSummaryFullListToggle = (next: boolean) => {
        if (next) { setSummaryFullCompetenceList(true); return; }
        const misplaced = computeMisplacedSummary();
        if (misplaced.length === 0) { setSummaryFullCompetenceList(false); return; }
        setPendingSummaryReconcile(misplaced);
    };

    // Confirm leaving full-list mode: drop every misplaced competence from its side,
    // clearing the matching facts/improvements and any mission link, then turn the
    // switch off — all in one draft update so the summary is never partial.
    const confirmSummaryReconcile = () => {
        if (!pendingSummaryReconcile) return;
        const strongDrop = new Set(pendingSummaryReconcile.filter(m => m.side === CompetenceSide.Strong).map(m => m.key));
        const developDrop = new Set(pendingSummaryReconcile.filter(m => m.side === CompetenceSide.Develop).map(m => m.key));
        const dropKeys = (rec: Record<string, string>, keys: Set<string>) => {
            const next = { ...rec };
            for (const k of keys) delete next[k];
            return next;
        };
        updateEvalDraft(rid, (d) => ({
            ...d,
            localEvals: d.localEvals.map(e => {
                const clearFacts = strongDrop.has(e.dimension_key);
                const clearImp = developDrop.has(e.dimension_key);
                if (!clearFacts && !clearImp) return e;
                return { ...e, facts: clearFacts ? [] : e.facts, improvements: clearImp ? [] : e.improvements };
            }),
            strongOptions: d.strongOptions.filter(o => !strongDrop.has(o.dimension_key)),
            developOptions: d.developOptions.filter(o => !developDrop.has(o.dimension_key)),
            strongDrafts: dropKeys(d.strongDrafts, strongDrop),
            developDrafts: dropKeys(d.developDrafts, developDrop),
            summaryFullCompetenceList: false,
        }));
        setPendingSummaryReconcile(null);
    };

    // Jump the facts section below to the tab of the given competence.
    const activateCompetenceTab = (key: string) => {
        const idx = visibleEvals.findIndex(e => e.dimension_key === key);
        if (idx >= 0) setActiveTab(idx);
    };

    // --- Competence summary helpers (shared by both sections) ---
    const addSummaryOption = (setter: SummarySetter, key: string) =>
        setter(prev => (prev.some(o => o.dimension_key === key) ? prev : [...prev, { dimension_key: key, comments: [] }]));
    const removeSummaryOption = (setter: SummarySetter, key: string) =>
        setter(prev => prev.filter(o => o.dimension_key !== key));
    // Removing a to-develop competence is now a plain removal. It used to need a
    // confirmation dialog because it also unlinked any mission targeting that
    // competence; missions no longer live in this draft, so there is nothing to
    // warn about and nothing to cascade.
    const removeDevelopOption = (key: string) => removeSummaryOption(setDevelopOptions, key);
    const addSummaryComment = (setter: SummarySetter, key: string, text: string) =>
        setter(prev => prev.map(o => (o.dimension_key === key ? { ...o, comments: [...o.comments, text.trim()] } : o)));
    const removeSummaryComment = (setter: SummarySetter, key: string, index: number) =>
        setter(prev => prev.map(o => (o.dimension_key === key ? { ...o, comments: o.comments.filter((_, i) => i !== index) } : o)));
    const editSummaryComment = (setter: SummarySetter, key: string, index: number, text: string) =>
        setter(prev => prev.map(o => (o.dimension_key === key ? { ...o, comments: o.comments.map((c, i) => (i === index ? text.trim() : c)) } : o)));
    // Reorder a whole competence card within its summary list (drop it *before* the
    // target row). The array order IS the persisted order.
    const reorderSummaryOption = (setter: SummarySetter, from: number, toRow: number) => {
        const to = from < toRow ? toRow - 1 : toRow;
        if (from === to) return;
        setter(prev => {
            const next = [...prev];
            const [moved] = next.splice(from, 1);
            next.splice(to, 0, moved);
            return next;
        });
    };

    // Set (or clear, when value is null) the score for one behaviour descriptor.
    const setCriterion = (evalId: number, index: number, value: number | null) => {
        setLocalEvals(prev => prev.map(e => {
            if (e.id !== evalId) return e;
            const cs = { ...e.criterionScores };
            if (value == null) delete cs[index];
            else cs[index] = value;
            return { ...e, criterionScores: cs };
        }));
    };

    // Star-change entry point for the dimension tabs. A re-rating that would move a
    // picked competence to the OPPOSITE summary list (by its new average) is held
    // back and confirmed via a dialog. Everything else applies immediately.
    const handleCriterionChange = (evalId: number, index: number, value: number | null) => {
        if (value == null) { setCriterion(evalId, index, value); return; }
        // Full-list mode intentionally keeps every picked competence regardless of
        // its new ranking, so a re-rating never flips/removes one — apply directly.
        if (summaryFullListActive) { setCriterion(evalId, index, value); return; }
        const ev = localEvals.find(e => e.id === evalId);
        if (!ev) { setCriterion(evalId, index, value); return; }
        // Evaluate the flip on the hypothetical post-change scores.
        const nextEvals = localEvals.map(e =>
            e.id === evalId ? { ...e, criterionScores: { ...e.criterionScores, [index]: value } } : e,
        );
        const side = detectCompetenceFlip(
            nextEvals, ev.dimension_key, isStrongPicked(ev.dimension_key), isDevelopPicked(ev.dimension_key),
            summaryMinOptions,
        );
        if (!side) { setCriterion(evalId, index, value); return; }
        setPendingFlip({ evalId, index, value, key: ev.dimension_key, side, name: competenceLabel(ev.dimension_key) });
    };

    // Confirm the held re-rating: flush other pending edits, then persist the flip
    // atomically on the server, then mirror that exact write into the local draft in
    // one update so the competence can never show in both lists.
    const confirmFlip = async () => {
        if (!pendingFlip) return;
        const { evalId, index, value, key, side } = pendingFlip;
        await flushAutosave();
        try {
            await flipCompetence(evalId, { criterion_index: index, new_score: value, leaving_side: side });
        } catch (err) {
            onError((err as Error).message);
            return;
        }
        const dropKey = (rec: Record<string, string>) => {
            if (!(key in rec)) return rec;
            const next = { ...rec }; delete next[key]; return next;
        };
        updateEvalDraft(rid, (d) => ({
            ...d,
            localEvals: d.localEvals.map(e =>
                e.id === evalId
                    ? {
                        ...e,
                        criterionScores: { ...e.criterionScores, [index]: value },
                        facts: side === CompetenceSide.Strong ? [] : e.facts,
                        improvements: side === CompetenceSide.Develop ? [] : e.improvements,
                    }
                    : e,
            ),
            strongOptions: side === CompetenceSide.Strong ? d.strongOptions.filter(o => o.dimension_key !== key) : d.strongOptions,
            developOptions: side === CompetenceSide.Develop ? d.developOptions.filter(o => o.dimension_key !== key) : d.developOptions,
            strongDrafts: side === CompetenceSide.Strong ? dropKey(d.strongDrafts) : d.strongDrafts,
            developDrafts: side === CompetenceSide.Develop ? dropKey(d.developDrafts) : d.developDrafts,
        }));
        setPendingFlip(null);
    };

    return {
        strongCandidates, developCandidates,
        copyFactToStrong, copyImprovementToDevelop,
        activateCompetenceTab,
        addSummaryOption, removeSummaryOption, removeDevelopOption,
        addSummaryComment, removeSummaryComment, editSummaryComment, reorderSummaryOption,
        handleSummaryFullListToggle, confirmSummaryReconcile,
        handleCriterionChange, confirmFlip,
        pendingFlip, setPendingFlip,
        pendingSummaryReconcile, setPendingSummaryReconcile,
    };
}

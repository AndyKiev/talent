import { useState, type Dispatch, type SetStateAction } from 'react';
import { flipCompetence, type RseDimensionType } from '../../peopleReviewApi';
import { deleteEmployeeFact } from '../../employeeFactApi';
import type { GetStringFn } from '../../../../types/getStringFn';
import type { EvaluationDraft } from '../../peopleReviewStore';
import {
    type DimensionOption,
    DimensionSide,
    type PendingFlip,
    type LocalEval,
    rankedCompetences,
    detectCompetenceFlip,
} from '../evaluationHelpers';

type OptionSetter = Dispatch<SetStateAction<DimensionOption[]>>;

interface Args {
    rid: number;
    updateEvalDraft: (rid: number, updater: (d: EvaluationDraft) => EvaluationDraft) => void;
    // Draft slices
    localEvals: LocalEval[];
    strongOptions: DimensionOption[];
    developOptions: DimensionOption[];
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
    setDevelopOptions: OptionSetter;
    setStrongDrafts: Dispatch<SetStateAction<Record<string, string>>>;
    setDevelopDrafts: Dispatch<SetStateAction<Record<string, string>>>;
    setSummaryFullCompetenceList: Dispatch<SetStateAction<boolean>>;
    // Settings + misc
    summaryMinOptions: number;
    /** The sides from the DB lookup — resolves a side to its id. */
    dimensionTypes: RseDimensionType[];
    getString: GetStringFn;
    flushAutosave: () => Promise<void>;
    setActiveTab: Dispatch<SetStateAction<number>>;
    onError: (message: string) => void;
    /** Non-error feedback (the copy-to-summary hints). */
    onNotice: (message: string) => void;
    /** The comment-input drafts, read side — the copy needs them to refuse a
     *  duplicate line rather than stacking it up invisibly. */
    strongDrafts: Record<string, string>;
    developDrafts: Record<string, string>;
}

/**
 * Orchestrates the dimensions singled out for this employee in this review —
 * the strong / to-develop selects, star re-ratings that flip a dimension to the
 * opposite side (confirmed atomically), the full-list toggle + reconcile, and
 * the linked-comment drafts. Holds the two pending-confirmation states that
 * drive the dialogs.
 *
 * The draft slices stay keyed on `dimension_key` while the server stores
 * `dimension_id`; each picked option carries both, so the ranking/flip rules
 * here need no lookup and the write path still sends real ids.
 *
 * Deliberately knows NOTHING about development missions. Missions used to live
 * in this same draft as free-text `dimension_key` strings, so changing a side
 * had to null out any mission pointing at a dropped dimension. They are now
 * employee-owned rows linked to review_dimensions.id, independent of any one
 * session — so a reviewer editing this must never silently rewrite the
 * employee's standing development plan.
 */
export function useRseDimensions({
    rid, updateEvalDraft,
    localEvals, strongOptions, developOptions,
    visibleEvals, competenceLabel, isStrongPicked, isDevelopPicked, summaryFullListActive,
    setLocalEvals, setDevelopOptions, setStrongDrafts, setDevelopDrafts,
    setSummaryFullCompetenceList,
    summaryMinOptions, dimensionTypes, getString, flushAutosave, setActiveTab, onError,
    onNotice, strongDrafts, developDrafts,
}: Args) {
    // Which summary card is CURRENTLY open for editing on each side, reported up
    // by the section. The copy-to-summary buttons live in the competence panel
    // below, so without this they append into an input nobody can see — which is
    // exactly how the same line ended up copied five times.
    const [strongOpenCard, setStrongOpenCard] = useState<string | null>(null);
    const [developOpenCard, setDevelopOpenCard] = useState<string | null>(null);
    // A star re-rating held back because it would flip a competence to the
    // opposite summary list — confirmed via a dialog, then applied atomically.
    const [pendingFlip, setPendingFlip] = useState<PendingFlip | null>(null);
    // Turning the full-list switch OFF re-arms ranked selection, so any picked
    // competence that no longer fits its side is re-evaluated and held here.
    const [pendingSummaryReconcile, setPendingSummaryReconcile] =
        useState<{ key: string; name: string; side: DimensionSide }[] | null>(null);

    // Push a line into the comment-input draft of one summary side. Facts prove
    // STRONG competences, so they copy only into the strong summary; the directions
    // for improvement feed only the to-develop summary. Each side has its own button.
    //
    // Two refusals, both learned from the same report: the input only EXISTS
    // while that competence's card is open for editing, so copying into a closed
    // card writes into nothing visible; and a line already in the card (saved or
    // still in the input) must not be appended again.
    const copyToSummary = (side: DimensionSide, key: string, text: string) => {
        const isStrong = side === DimensionSide.Strong;
        const openCard = isStrong ? strongOpenCard : developOpenCard;
        const name = competenceLabel(key);
        if (openCard !== key) {
            onNotice(getString('openSummaryEditFirst', { competence: name }));
            return;
        }
        const trimmed = text.trim();
        if (!trimmed) return;
        const options = isStrong ? strongOptions : developOptions;
        const draft = (isStrong ? strongDrafts : developDrafts)[key] ?? '';
        const saved = options.find(o => o.dimension_key === key)?.comments ?? [];
        const present = [
            ...saved.map(c => c.trim()),
            ...draft.split('\n').map(l => l.trim()),
        ];
        if (present.includes(trimmed)) {
            onNotice(getString('alreadyInSummary', { competence: name }));
            return;
        }
        const setter = isStrong ? setStrongDrafts : setDevelopDrafts;
        setter(prev => ({ ...prev, [key]: prev[key] ? `${prev[key]}\n${trimmed}` : trimmed }));
    };
    const copyFactToStrong = (key: string, text: string) =>
        copyToSummary(DimensionSide.Strong, key, text);
    const copyImprovementToDevelop = (key: string, text: string) =>
        copyToSummary(DimensionSide.Develop, key, text);

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
    const computeMisplacedSummary = (): { key: string; name: string; side: DimensionSide }[] => {
        const strongKeys = new Set(rankedCompetences(visibleEvals, 'desc', summaryMinOptions).map(e => e.dimension_key));
        const developKeys = new Set(rankedCompetences(visibleEvals, 'asc', summaryMinOptions).map(e => e.dimension_key));
        const out: { key: string; name: string; side: DimensionSide }[] = [];
        for (const o of strongOptions) {
            if (developKeys.has(o.dimension_key) && !strongKeys.has(o.dimension_key)) {
                out.push({ key: o.dimension_key, name: competenceLabel(o.dimension_key), side: DimensionSide.Strong });
            }
        }
        for (const o of developOptions) {
            if (strongKeys.has(o.dimension_key) && !developKeys.has(o.dimension_key)) {
                out.push({ key: o.dimension_key, name: competenceLabel(o.dimension_key), side: DimensionSide.Develop });
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
        const strongDrop = new Set(pendingSummaryReconcile.filter(m => m.side === DimensionSide.Strong).map(m => m.key));
        const developDrop = new Set(pendingSummaryReconcile.filter(m => m.side === DimensionSide.Develop).map(m => m.key));
        const dropKeys = (rec: Record<string, string>, keys: Set<string>) => {
            const next = { ...rec };
            for (const k of keys) delete next[k];
            return next;
        };
        // The lists are rows now: clearing them in the draft is not enough, since
        // nothing writes them back any more. Delete the rows explicitly, the same
        // way flip_competence does server-side for a single competence.
        for (const e of localEvals) {
            if (strongDrop.has(e.dimension_key)) {
                for (const f of e.facts) void deleteEmployeeFact(f.id).catch(() => {});
            }
            if (developDrop.has(e.dimension_key)) {
                for (const f of e.improvements) void deleteEmployeeFact(f.id).catch(() => {});
            }
        }
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
    // A picked option carries the dimension id (what the server stores) alongside
    // its key and display name — all taken from the evaluation row the candidate
    // was built from, so a freshly added competence looks identical to a loaded one.
    const addDimensionOption = (setter: OptionSetter, key: string) =>
        setter(prev => {
            if (prev.some(o => o.dimension_key === key)) return prev;
            const ev = visibleEvals.find(e => e.dimension_key === key);
            if (!ev) return prev;
            return [...prev, {
                dimension_id: ev.dimension_id,
                dimension_key: key,
                dimension_name: competenceLabel(key),
                dimension_color: ev.dimension_color,
                comments: [],
            }];
        });
    const removeDimensionOption = (setter: OptionSetter, key: string) =>
        setter(prev => prev.filter(o => o.dimension_key !== key));
    // Removing a to-develop competence is now a plain removal. It used to need a
    // confirmation dialog because it also unlinked any mission targeting that
    // competence; missions no longer live in this draft, so there is nothing to
    // warn about and nothing to cascade.
    const removeDevelopOption = (key: string) => removeDimensionOption(setDevelopOptions, key);
    const addDimensionComment = (setter: OptionSetter, key: string, text: string) =>
        setter(prev => prev.map(o => (o.dimension_key === key ? { ...o, comments: [...o.comments, text.trim()] } : o)));
    const removeDimensionComment = (setter: OptionSetter, key: string, index: number) =>
        setter(prev => prev.map(o => (o.dimension_key === key ? { ...o, comments: o.comments.filter((_, i) => i !== index) } : o)));
    const editDimensionComment = (setter: OptionSetter, key: string, index: number, text: string) =>
        setter(prev => prev.map(o => (o.dimension_key === key ? { ...o, comments: o.comments.map((c, i) => (i === index ? text.trim() : c)) } : o)));
    // Reorder a whole competence card within its summary list (drop it *before* the
    // target row). The array order IS the persisted order.
    const reorderDimensionOption = (setter: OptionSetter, from: number, toRow: number) => {
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
        // The side travels as the id of its review_session_employee_dimension_types row, looked
        // up by key — the server deletes exactly that row of the summary.
        const leavingTypeId = dimensionTypes.find(t => t.key === side)?.id;
        if (leavingTypeId == null) {
            onError(getString('dimensionTypesUnavailable'));
            return;
        }
        await flushAutosave();
        try {
            await flipCompetence(evalId, { criterion_index: index, new_score: value, leaving_type_id: leavingTypeId });
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
                        facts: side === DimensionSide.Strong ? [] : e.facts,
                        improvements: side === DimensionSide.Develop ? [] : e.improvements,
                    }
                    : e,
            ),
            strongOptions: side === DimensionSide.Strong ? d.strongOptions.filter(o => o.dimension_key !== key) : d.strongOptions,
            developOptions: side === DimensionSide.Develop ? d.developOptions.filter(o => o.dimension_key !== key) : d.developOptions,
            strongDrafts: side === DimensionSide.Strong ? dropKey(d.strongDrafts) : d.strongDrafts,
            developDrafts: side === DimensionSide.Develop ? dropKey(d.developDrafts) : d.developDrafts,
        }));
        setPendingFlip(null);
    };

    return {
        strongCandidates, developCandidates,
        copyFactToStrong, copyImprovementToDevelop,
        setStrongOpenCard, setDevelopOpenCard,
        activateCompetenceTab,
        addDimensionOption, removeDimensionOption, removeDevelopOption,
        addDimensionComment, removeDimensionComment, editDimensionComment, reorderDimensionOption,
        handleSummaryFullListToggle, confirmSummaryReconcile,
        handleCriterionChange, confirmFlip,
        pendingFlip, setPendingFlip,
        pendingSummaryReconcile, setPendingSummaryReconcile,
    };
}

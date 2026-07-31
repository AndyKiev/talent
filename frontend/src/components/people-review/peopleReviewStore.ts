import { create } from 'zustand';
import type { GetStringFn } from '../../types/getStringFn';
import type {
    Evaluation,
    ReviewSessionEmployee,
    EmployeeLanguageProfile,
    RseDimensionType,
    RseFeedbackItem,
} from './peopleReviewApi';
import {
    type LocalEval,
    type DimensionOption,
    DimensionSide,
    competenceHint,
    competenceName,
    parseDescriptors,
    dimensionOptionsForType,
} from './evaluation/evaluationHelpers';

// ---------------------------------------------------------------------------
// Draft shapes — the editable, unsaved state that must survive navigation
// between employees / pages. Keyed by review-session-employee id (rseId).
// ---------------------------------------------------------------------------

export interface EvaluationDraft {
    localEvals: LocalEval[];
    langSel: Record<string, number | null>;
    employeeFeedback: string;
    managerFeedback: string;
    results: string[];
    strongOptions: DimensionOption[];
    developOptions: DimensionOption[];
    strongDrafts: Record<string, string>;
    developDrafts: Record<string, string>;
    // Persisted per-review switch: when true (and the global setting allows it)
    // the summary selects offer the full competence list and star re-ratings stop
    // removing picked competences.
    summaryFullCompetenceList: boolean;
}

export interface ProposedDraft {
    levelId: number | '';
    // requirement_id -> list of comments
    answers: Record<number, string[]>;
    // requirement_id -> in-progress comment input
    drafts: Record<number, string>;
}

// Stable frozen sentinels returned (via `?? EMPTY_*` in the component, never in a
// selector) for an un-hydrated draft, so reads keep a constant object reference
// and don't trigger render loops. See store/tableStore.ts for the same pattern.
export const EMPTY_EVAL_DRAFT: EvaluationDraft = Object.freeze({
    localEvals: [],
    langSel: Object.freeze({ english: null, french: null }) as Record<string, number | null>,
    employeeFeedback: '',
    managerFeedback: '',
    results: [],
    strongOptions: [],
    developOptions: [],
    strongDrafts: Object.freeze({}) as Record<string, string>,
    developDrafts: Object.freeze({}) as Record<string, string>,
    summaryFullCompetenceList: false,
});

export const EMPTY_PROPOSED_DRAFT: ProposedDraft = Object.freeze({
    levelId: '',
    answers: Object.freeze({}) as Record<number, string[]>,
    drafts: Object.freeze({}) as Record<number, string>,
});

// ---------------------------------------------------------------------------
// Seeding — turn the loaded server data into an editable draft.
// ---------------------------------------------------------------------------

/** Build the editable competence rows from the loaded evaluations. */
function buildLocalEvals(evaluations: Evaluation[], getString: GetStringFn): LocalEval[] {
    // Render in the admin-defined order (sort_order, id tiebreak) — same order
    // used everywhere else this dimension appears.
    const ordered = [...evaluations].sort(
        (a, b) => (a.dimension_sort_order - b.dimension_sort_order) || (a.id - b.id),
    );
    return ordered.map((e) => {
        // Behaviour descriptors come from the criteria FROZEN into this session at
        // open time (their order is fixed, so the per-index scores stay valid even
        // if the live criteria are later edited/deleted). Sessions opened before
        // the freeze carry no frozen criteria → fall back to the competence hint
        // (•-bulleted), then to a single descriptor (the competence name).
        let descriptors = (e.criteria ?? [])
            .slice()
            .sort((a, b) => a.sort_order - b.sort_order || a.id - b.id)
            .map((c) => c.text);
        if (descriptors.length === 0) {
            const hintText = competenceHint(getString, e.dimension_key, e.dimension_description ?? '');
            descriptors = parseDescriptors(hintText);
        }
        if (descriptors.length === 0) {
            descriptors = [competenceName(getString, e.dimension_key, e.dimension_name)];
        }
        const criterionScores: Record<number, number> = {};
        for (const cs of e.criterion_scores) {
            if (cs.criterion_index >= 0 && cs.criterion_index < descriptors.length) {
                criterionScores[cs.criterion_index] = cs.score;
            }
        }
        return {
            id: e.id,
            dimension_id: e.dimension_id,
            dimension_name: e.dimension_name,
            dimension_key: e.dimension_key,
            dimension_description: e.dimension_description ?? null,
            dimension_is_active: e.dimension_is_active,
            dimension_color: e.dimension_color,
            dimension_sort_order: e.dimension_sort_order,
            descriptors,
            criterionScores,
            facts: e.facts,
            improvements: e.improvements,
        };
    });
}

/** The two seeded feedback-type keys. Code contract: each voice has its own
 *  editability rule, so the frontend must be able to tell them apart. */
export const RSE_FEEDBACK_EMPLOYEE = 'employee';
export const RSE_FEEDBACK_MANAGER = 'manager';

/** Text of one voice, or '' when that voice has no row. */
const feedbackText = (items: RseFeedbackItem[] | undefined, key: string): string =>
    items?.find(f => f.review_session_employee_feedback_type_key === key)?.text ?? '';

/** Build an editable evaluation draft from the loaded server data. */
export function buildEvaluationDraft(
    rseDetail: ReviewSessionEmployee,
    evaluations: Evaluation[],
    langProfile: EmployeeLanguageProfile | undefined,
    getString: GetStringFn,
    dimensionTypes: RseDimensionType[],
): EvaluationDraft {
    const langSel: Record<string, number | null> = { english: null, french: null };
    if (langProfile) {
        for (const l of langProfile.languages) langSel[l.language] = l.level_id;
    }
    // The summary arrives as ONE flat, already-ordered list; each item names its
    // side by id. Split it by matching the type rows BY KEY — no JSON.parse, and
    // no hardcoded id.
    const items = rseDetail.dimensions ?? [];
    const typeId = (key: DimensionSide) => dimensionTypes.find(t => t.key === key)?.id;
    return {
        localEvals: buildLocalEvals(evaluations, getString),
        langSel,
        // Feedback is rows keyed by a TYPE now. The draft keeps the two boxes
        // the UI actually renders, matched BY KEY — a voice with no row is
        // simply an empty box.
        employeeFeedback: feedbackText(rseDetail.feedbacks, RSE_FEEDBACK_EMPLOYEE),
        managerFeedback: feedbackText(rseDetail.feedbacks, RSE_FEEDBACK_MANAGER),
        // Rows now — the draft keeps just the texts, since the write path
        // replaces the whole list and derives sort_order from the array order.
        results: (rseDetail.results ?? []).map(r => r.text),
        strongOptions: dimensionOptionsForType(items, typeId(DimensionSide.Strong)),
        developOptions: dimensionOptionsForType(items, typeId(DimensionSide.Develop)),
        strongDrafts: {},
        developDrafts: {},
        summaryFullCompetenceList: rseDetail.summary_full_competence_list ?? false,
    };
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

interface PeopleReviewStore {
    evalDrafts: Record<number, EvaluationDraft>;
    proposedDrafts: Record<number, ProposedDraft>;

    hydrateEvalDraft: (rseId: number, draft: EvaluationDraft) => void;
    updateEvalDraft: (rseId: number, updater: (d: EvaluationDraft) => EvaluationDraft) => void;
    clearEvalDraft: (rseId: number) => void;

    hydrateProposedDraft: (rseId: number, draft: ProposedDraft) => void;
    updateProposedDraft: (rseId: number, updater: (d: ProposedDraft) => ProposedDraft) => void;
    clearProposedDraft: (rseId: number) => void;
}

export const usePeopleReviewStore = create<PeopleReviewStore>((set) => ({
    evalDrafts: {},
    proposedDrafts: {},

    hydrateEvalDraft: (rseId, draft) =>
        set((state) => ({ evalDrafts: { ...state.evalDrafts, [rseId]: draft } })),
    updateEvalDraft: (rseId, updater) =>
        set((state) => ({
            evalDrafts: {
                ...state.evalDrafts,
                [rseId]: updater(state.evalDrafts[rseId] ?? EMPTY_EVAL_DRAFT),
            },
        })),
    clearEvalDraft: (rseId) =>
        set((state) => {
            if (!(rseId in state.evalDrafts)) return state;
            const next = { ...state.evalDrafts };
            delete next[rseId];
            return { evalDrafts: next };
        }),

    hydrateProposedDraft: (rseId, draft) =>
        set((state) => ({ proposedDrafts: { ...state.proposedDrafts, [rseId]: draft } })),
    updateProposedDraft: (rseId, updater) =>
        set((state) => ({
            proposedDrafts: {
                ...state.proposedDrafts,
                [rseId]: updater(state.proposedDrafts[rseId] ?? EMPTY_PROPOSED_DRAFT),
            },
        })),
    clearProposedDraft: (rseId) =>
        set((state) => {
            if (!(rseId in state.proposedDrafts)) return state;
            const next = { ...state.proposedDrafts };
            delete next[rseId];
            return { proposedDrafts: next };
        }),
}));

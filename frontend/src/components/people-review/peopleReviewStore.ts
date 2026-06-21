import { create } from 'zustand';
import type { GetStringFn } from '../../types/getStringFn';
import type {
    Evaluation,
    ReviewSessionEmployee,
    EmployeeLanguageProfile,
} from './peopleReviewApi';
import {
    type LocalEval,
    type SummaryOption,
    competenceHint,
    competenceName,
    parseDescriptors,
    parseFacts,
    parseMissions,
    parseSummarySide,
    MISSION_COUNT,
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
    missions: string[];
    trainings: string;
    strongOptions: SummaryOption[];
    developOptions: SummaryOption[];
    strongDrafts: Record<string, string>;
    developDrafts: Record<string, string>;
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
    missions: [],
    trainings: '',
    strongOptions: [],
    developOptions: [],
    strongDrafts: Object.freeze({}) as Record<string, string>,
    developDrafts: Object.freeze({}) as Record<string, string>,
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
export function buildLocalEvals(evaluations: Evaluation[], getString: GetStringFn): LocalEval[] {
    // Render in the admin-defined order (sort_order, id tiebreak) — same order
    // used everywhere else this dimension appears.
    const ordered = [...evaluations].sort(
        (a, b) => (a.dimension_sort_order - b.dimension_sort_order) || (a.id - b.id),
    );
    return ordered.map((e) => {
        // Behaviour descriptors come from the competence hint (•-bulleted);
        // fall back to a single descriptor (the competence name) when there is none.
        const hintText = competenceHint(getString, e.dimension_key, e.dimension_description ?? '');
        let descriptors = parseDescriptors(hintText);
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
            facts: parseFacts(e.facts),
            improvements: parseFacts(e.improvement),
        };
    });
}

/** Build an editable evaluation draft from the loaded server data. */
export function buildEvaluationDraft(
    rseDetail: ReviewSessionEmployee,
    evaluations: Evaluation[],
    langProfile: EmployeeLanguageProfile | undefined,
    getString: GetStringFn,
): EvaluationDraft {
    const langSel: Record<string, number | null> = { english: null, french: null };
    if (langProfile) {
        for (const l of langProfile.languages) langSel[l.language] = l.level_id;
    }
    let summary: { strong?: unknown; develop?: unknown } = {};
    if (rseDetail.competence_summary) {
        try { summary = JSON.parse(rseDetail.competence_summary); } catch { summary = {}; }
    }
    return {
        localEvals: buildLocalEvals(evaluations, getString),
        langSel,
        employeeFeedback: rseDetail.employee_feedback ?? '',
        managerFeedback: rseDetail.manager_feedback ?? '',
        results: parseFacts(rseDetail.results_achievements),
        missions: parseMissions(rseDetail.development_plan, MISSION_COUNT),
        trainings: rseDetail.trainings ?? '',
        strongOptions: parseSummarySide(summary.strong),
        developOptions: parseSummarySide(summary.develop),
        strongDrafts: {},
        developDrafts: {},
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

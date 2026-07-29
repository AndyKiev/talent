// src/components/people-review/evaluation/sectionOrder.ts
//
// The three big blocks of the employee evaluation page and the order they are
// stacked in, top to bottom. The order is an app setting (developer default,
// per-user overridable) rather than a constant, so a reviewer can put the part
// they work with first. Domain enum + one label helper, per CLAUDE.md.
import type { GetStringFn } from '../../../types/getStringFn';

/** Setting key holding the order as a JSON array of section ids. */
export const SECTION_ORDER_SETTING_KEY = 'people_review_section_order';

export enum EvaluationSection {
    /** Personal data, job info, feedback, results, trainings. */
    EmployeeData = 'employee_data',
    /** Scores overview, competences summary, development plan. */
    Analysis = 'analysis',
    /** Per-competence detail tabs (criteria, facts, improvements). */
    Competences = 'competences',
}

export interface EvaluationSectionMeta {
    /** Stable numeric id — ReorderableList keys rows by number. */
    id: number;
    section: EvaluationSection;
    labelKey: string;
}

/** Registry in DEFAULT order (also the fallback when nothing is stored). */
export const EVALUATION_SECTIONS: EvaluationSectionMeta[] = [
    { id: 1, section: EvaluationSection.EmployeeData, labelKey: 'sectionEmployeeData' },
    { id: 2, section: EvaluationSection.Analysis, labelKey: 'sectionCompetencesAnalysis' },
    { id: 3, section: EvaluationSection.Competences, labelKey: 'sectionCompetenceDetails' },
];

export const DEFAULT_SECTION_ORDER: EvaluationSection[] =
    EVALUATION_SECTIONS.map((s) => s.section);

const BY_SECTION = new Map(EVALUATION_SECTIONS.map((s) => [s.section, s]));
const BY_ID = new Map(EVALUATION_SECTIONS.map((s) => [s.id, s]));

function isSection(value: unknown): value is EvaluationSection {
    return typeof value === 'string' && BY_SECTION.has(value as EvaluationSection);
}

/**
 * Read a stored setting value into a usable order: unknown entries are dropped,
 * duplicates collapse to their first occurrence, and any section missing from
 * the stored list is appended in default order. A stored value can be edited by
 * hand in developer settings, so it is never trusted to be complete or clean.
 */
export function normalizeSectionOrder(value: unknown): EvaluationSection[] {
    const raw = Array.isArray(value) ? value : [];
    const seen = new Set<EvaluationSection>();
    const order: EvaluationSection[] = [];
    for (const entry of raw) {
        if (!isSection(entry) || seen.has(entry)) continue;
        seen.add(entry);
        order.push(entry);
    }
    for (const section of DEFAULT_SECTION_ORDER) {
        if (!seen.has(section)) order.push(section);
    }
    return order;
}

export function sectionMeta(section: EvaluationSection): EvaluationSectionMeta {
    // Every enum member is registered above, so this cannot miss.
    return BY_SECTION.get(section) as EvaluationSectionMeta;
}

/** Map the ids ReorderableList emits back to sections, dropping strays. */
export function sectionsFromIds(ids: number[]): EvaluationSection[] {
    const sections = ids
        .map((id) => BY_ID.get(id))
        .filter((meta): meta is EvaluationSectionMeta => !!meta)
        .map((meta) => meta.section);
    return normalizeSectionOrder(sections);
}

/** The one enum -> translation-key label helper. */
export function sectionLabel(getString: GetStringFn, section: EvaluationSection): string {
    return getString(sectionMeta(section).labelKey);
}

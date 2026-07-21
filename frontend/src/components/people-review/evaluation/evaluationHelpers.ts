import dayjs from 'dayjs';
import type { GetStringFn } from '../../../types/getStringFn';

/**
 * The summary list a competence is picked into. Values ('strong'/'develop') are
 * the wire/persisted form — they match the `competence_summary` JSON keys and the
 * API `leaving_side`, so a string enum keeps serialization identical.
 */
export enum CompetenceSide {
    Strong = 'strong',
    Develop = 'develop',
}

/** Which list a dragged item belongs to — facts/achievements or improvements. */
export enum DragItemKind {
    Fact = 'fact',
    Improvement = 'improvement',
}

// Enum → translation-key maps: the ONE place these domain concepts are mapped to
// message keys (callers resolve via getString instead of inline string ternaries).
const COMPETENCE_SIDE_LABEL_KEYS: Record<CompetenceSide, string> = {
    [CompetenceSide.Strong]: 'strongCompetences',
    [CompetenceSide.Develop]: 'competencesToDevelop',
};
const COMPETENCE_SIDE_FLIP_KEYS: Record<CompetenceSide, string> = {
    [CompetenceSide.Strong]: 'flipCompetenceFromStrong',
    [CompetenceSide.Develop]: 'flipCompetenceFromDevelop',
};
const DRAG_ITEM_TITLE_KEYS: Record<DragItemKind, string> = {
    [DragItemKind.Fact]: 'moveFactTitle',
    [DragItemKind.Improvement]: 'moveImprovementTitle',
};
const DRAG_ITEM_CONFIRM_KEYS: Record<DragItemKind, string> = {
    [DragItemKind.Fact]: 'moveFactConfirm',
    [DragItemKind.Improvement]: 'moveImprovementConfirm',
};

/** Translation key for a summary side's header label. */
export const competenceSideLabelKey = (side: CompetenceSide): string =>
    COMPETENCE_SIDE_LABEL_KEYS[side];
/** Translation key for the confirm text shown when a competence flips OUT of `side`. */
export const competenceSideFlipKey = (side: CompetenceSide): string =>
    COMPETENCE_SIDE_FLIP_KEYS[side];
/** Translation key for the "move item" dialog title, by dragged-item kind. */
export const dragItemTitleKey = (kind: DragItemKind): string =>
    DRAG_ITEM_TITLE_KEYS[kind];
/** Translation key for the "move item" confirm text, by dragged-item kind. */
export const dragItemConfirmKey = (kind: DragItemKind): string =>
    DRAG_ITEM_CONFIRM_KEYS[kind];

// Ukrainian (and similar) need 3 plural forms; English collapses few→many.
// Returns the key suffix used to pick the right noun-form translation key.
function pluralCat(n: number, lang: string): 'One' | 'Few' | 'Many' {
    if (lang !== 'ukr') return n === 1 ? 'One' : 'Many';
    const mod10 = n % 10;
    const mod100 = n % 100;
    if (mod10 === 1 && mod100 !== 11) return 'One';
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'Few';
    return 'Many';
}

// "2 years 3 months" (localized, pluralized). Months hidden when 0 unless the
// whole duration is under a year. `lang` is the user's short language code.
export function formatYearsMonths(iso: string, getString: GetStringFn, lang: string): string {
    const total = dayjs().diff(dayjs(iso), 'month');
    const years = Math.floor(total / 12);
    const months = total % 12;
    const parts: string[] = [];
    if (years > 0) parts.push(getString(`durationYear${pluralCat(years, lang)}`, { n: years }));
    if (months > 0 || years === 0) parts.push(getString(`durationMonth${pluralCat(months, lang)}`, { n: months }));
    return parts.join(' ');
}

const DIMENSION_COLORS: Record<string, string> = {
    TRANSFORMATION:   '#1565C0',
    ETHICS:           '#2E7D32',
    MOBILIZATION:     '#E65100',
    PEOPLE_PLANET:    '#0097A7',
    OPENNESS:         '#D32F2F',
    CUSTOMER_RESULTS: '#AD1457',
};
const FALLBACK_COLORS = ['#1565C0','#2E7D32','#E65100','#0097A7','#6A1B9A','#AD1457','#0277BD','#558B2F'];

/**
 * Resolve a dimension's display color. The DB is the source of truth: when a
 * backend `dbColor` is provided it always wins. The legacy key map and the
 * index-cycled palette remain only as a fallback for callers without a color.
 */
export function getDimColor(key: string, idx: number, dbColor?: string | null) {
    if (dbColor) return dbColor;
    return DIMENSION_COLORS[key] ?? FALLBACK_COLORS[idx % FALLBACK_COLORS.length];
}

// Header accents for the two competence-summary boxes. They keep the "mood"
// (strong = good greens/blues, to-develop = alert reds/oranges) but each palette
// spans a range (green→teal→blue, red→orange→amber) so the picker can move away
// from a competence color that shares the same hue family.
const STRONG_ACCENTS = ['#00A651', '#1B873F', '#0CA678', '#0B7285', '#1971C2', '#1864AB', '#3B5BDB'];
const DEVELOP_ACCENTS = ['#E03131', '#C92A2A', '#D9480F', '#E8590C', '#F76707', '#F08C00', '#F59F00'];

function hexToRgb(hex: string): [number, number, number] | null {
    let h = hex.trim().replace('#', '');
    if (h.length === 3) h = h.split('').map(c => c + c).join('');
    if (h.length !== 6) return null;
    const n = parseInt(h, 16);
    if (Number.isNaN(n)) return null;
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

// Perceptual-ish color distance ("redmean") — cheap and far closer to human
// perception than plain RGB euclidean, so reds aren't called "far" from oranges
// when they actually look alike.
function colorDistance(a: [number, number, number], b: [number, number, number]): number {
    const rmean = (a[0] + b[0]) / 2;
    const dr = a[0] - b[0], dg = a[1] - b[1], db = a[2] - b[2];
    return Math.sqrt((2 + rmean / 256) * dr * dr + 4 * dg * dg + (2 + (255 - rmean) / 256) * db * db);
}

/**
 * Pick a summary-header accent from the family palette that is the most visually
 * DISTINCT from the listed competence colors — the palette entry whose nearest
 * competence color is farthest away (maximize the minimum distance). This avoids
 * "different hex but same-looking hue" collisions, while staying in the family.
 */
export function pickSummaryAccent(family: CompetenceSide, usedColors: Iterable<string>): string {
    const palette = family === CompetenceSide.Strong ? STRONG_ACCENTS : DEVELOP_ACCENTS;
    const used = [...usedColors]
        .map(hexToRgb)
        .filter((c): c is [number, number, number] => c !== null);
    if (used.length === 0) return palette[0];
    let best = palette[0];
    let bestScore = -1;
    for (const cand of palette) {
        const rgb = hexToRgb(cand);
        if (!rgb) continue;
        const nearest = Math.min(...used.map(u => colorDistance(rgb, u)));
        if (nearest > bestScore) {
            bestScore = nearest;
            best = cand;
        }
    }
    return best;
}

// Derive the message-key suffix from a dimension key: "PEOPLE_PLANET" -> "PeoplePlanet".
function pascalFromDimensionKey(key: string): string {
    return key
        .split('_')
        .filter(Boolean)
        .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
        .join('');
}

/**
 * Resolve a DB translation by a `<prefix><PascalKey>` convention (e.g.
 * `competenceTransformation`), falling back to the DB-provided value when the
 * key is absent. The localized text already lives in the DB — this just derives
 * the key instead of hardcoding a dimension-key→message-key map.
 */
function translatedByDimension(
    getString: GetStringFn, prefix: string, key: string, fallback: string,
): string {
    if (!key) return fallback;
    const strKey = `${prefix}${pascalFromDimensionKey(key)}`;
    const text = getString(strKey);
    return text && text !== strKey ? text : fallback;
}

/** Translated competence name, falling back to the DB-provided dimension name. */
export function competenceName(getString: GetStringFn, key: string, fallback: string): string {
    return translatedByDimension(getString, 'competence', key, fallback);
}

/** Translated competence hint (multi-line), falling back to the DB description. */
export function competenceHint(getString: GetStringFn, key: string, fallback: string): string {
    return translatedByDimension(getString, 'competenceHint', key, fallback);
}

export interface LocalEval {
    id: number;
    dimension_id: number;
    dimension_name: string;
    dimension_key: string;
    dimension_description: string | null;
    dimension_is_active: boolean;
    dimension_color: string;
    dimension_sort_order: number;
    // Behaviour descriptors (hint bullets) shown as children, each rated 1..MAX_GRADE.
    descriptors: string[];
    // criterion_index -> score (1..MAX_GRADE). Sparse: unrated descriptors are absent.
    criterionScores: Record<number, number>;
    facts: string[];
    // Directions for improvement — a numbered list (stored serialized like facts).
    improvements: string[];
}

/** An item being dragged: its list (kind), competence (evalId) and row index. */
export interface DraggedItem {
    kind: DragItemKind;
    evalId: number;
    index: number;
}

/** An item pending confirmation to move into another competence tab. */
export interface PendingMove {
    kind: DragItemKind;
    fromEvalId: number;
    index: number;
    text: string;
    toEvalId: number;
    toTabIndex: number;
    toName: string;
}

/** Split a stored facts string (e.g. "1. fact one\n2. fact two") into an array, stripping numbering. */
export function parseFacts(raw: string | null): string[] {
    if (!raw) return [];
    return raw
        .split('\n')
        .map(line => line.replace(/^\d+\.\s*/, '').trim())
        .filter(line => line.length > 0);
}

/** Serialize a facts array back to a numbered string for storage. */
export function serializeFacts(facts: string[]): string {
    if (facts.length === 0) return '';
    return facts.map((f, i) => `${i + 1}. ${f}`).join('\n');
}

/** Split a competence hint (•-bulleted, newline-joined) into individual behaviour descriptors. */
export function parseDescriptors(hint: string): string[] {
    if (!hint) return [];
    return hint
        .split('\n')
        .map(line => line.replace(/^\s*[•\-*]\s*/, '').replace(/^\s*\d+[.)]\s*/, '').trim())
        .filter(line => line.length > 0);
}

/** Arithmetic mean of a competence's rated behaviour scores (null when none rated). */
export function evalMean(le: LocalEval): number | null {
    const vals = le.descriptors
        .map((_, i) => le.criterionScores[i])
        .filter((v): v is number => v != null);
    if (vals.length === 0) return null;
    return vals.reduce((a, b) => a + b, 0) / vals.length;
}

/** A competence counts as filled only once every one of its behaviour descriptors is rated. */
export function evalFilled(le: LocalEval): boolean {
    return le.descriptors.length > 0 && le.descriptors.every((_, i) => le.criterionScores[i] != null);
}

// Fixed set of foreign languages the employee declares a level for.
export const FOREIGN_LANGUAGES: { key: string; labelKey: 'english' | 'french' }[] = [
    { key: 'english', labelKey: 'english' },
    { key: 'french', labelKey: 'french' },
];

// One picked competence in the summary, with its linked comments.
export interface SummaryOption {
    dimension_key: string;
    comments: string[];
}

/**
 * Default minimum number of competences each summary select should offer. The
 * live value comes from the `pr_summary_min_options` developer setting, threaded
 * in as the `minOptions` argument; this constant is only the safety fallback.
 */
const SUMMARY_MIN_OPTIONS = 2;

/** Parse a stored {strong, develop} summary array for one side. */
export function parseSummarySide(raw: unknown): SummaryOption[] {
    if (!Array.isArray(raw)) return [];
    const out: SummaryOption[] = [];
    for (const item of raw) {
        if (item && typeof item === 'object' && 'dimension_key' in item) {
            const key = String((item as { dimension_key: unknown }).dimension_key ?? '');
            const rawComments = (item as { comments?: unknown }).comments;
            const comments = Array.isArray(rawComments) ? rawComments.map(c => String(c ?? '')) : [];
            if (key) out.push({ dimension_key: key, comments });
        }
    }
    return out;
}

/**
 * Candidate competences for a summary select: the top (or bottom) scored ones.
 * Always offers at least `minOptions`, plus any tied at the boundary score — up
 * to all of them when scores are equal. `minOptions` comes from the
 * `pr_summary_min_options` setting (default SUMMARY_MIN_OPTIONS).
 */
export function rankedCompetences(
    evals: LocalEval[],
    direction: 'desc' | 'asc',
    minOptions: number = SUMMARY_MIN_OPTIONS,
): LocalEval[] {
    const min = Math.max(1, Math.floor(minOptions));
    if (evals.length <= min) return [...evals];
    const sorted = [...evals].sort((a, b) =>
        direction === 'desc' ? (evalMean(b) ?? 0) - (evalMean(a) ?? 0) : (evalMean(a) ?? 0) - (evalMean(b) ?? 0),
    );
    const threshold = evalMean(sorted[min - 1]) ?? 0;
    return sorted.filter(e =>
        direction === 'desc' ? (evalMean(e) ?? 0) >= threshold : (evalMean(e) ?? 0) <= threshold,
    );
}

/** A star re-rating pending confirmation because it flips a competence's summary list. */
export interface PendingFlip {
    evalId: number;
    index: number;
    value: number;
    key: string;
    // The side the competence currently sits in and will be removed FROM.
    side: CompetenceSide;
    name: string;
}

/**
 * Decide whether re-rating competence `key` (on the ALREADY-updated `evals`)
 * flips it to the opposite summary list — i.e. its new average star ranking now
 * puts it on the other side from where it is currently picked. Returns the side
 * it must LEAVE, or null when no flip is warranted.
 *
 * Relative ranking (per design): a competence picked in "strong" flips when it
 * now ranks among the lowest-scored (develop) competences and no longer among
 * the highest-scored (strong); symmetric for "develop". A boundary tie — where
 * the competence still qualifies for BOTH sides — does NOT flip.
 */
export function detectCompetenceFlip(
    evals: LocalEval[],
    key: string,
    isStrongPicked: boolean,
    isDevelopPicked: boolean,
    minOptions: number = SUMMARY_MIN_OPTIONS,
): CompetenceSide | null {
    const strongKeys = new Set(rankedCompetences(evals, 'desc', minOptions).map(e => e.dimension_key));
    const developKeys = new Set(rankedCompetences(evals, 'asc', minOptions).map(e => e.dimension_key));
    if (isStrongPicked && developKeys.has(key) && !strongKeys.has(key)) return CompetenceSide.Strong;
    if (isDevelopPicked && strongKeys.has(key) && !developKeys.has(key)) return CompetenceSide.Develop;
    return null;
}
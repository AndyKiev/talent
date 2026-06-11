import { useState, useEffect, type Dispatch, type SetStateAction } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from '@tanstack/react-router';
import {
    Alert,
    Box,
    Breadcrumbs,
    Button,
    Chip,
    CircularProgress,
    FormControl,
    IconButton,
    InputLabel,
    MenuItem,
    Select,
    Snackbar,
    Stack,
    Tab,
    Tabs,
    TextField,
    Tooltip,
    Typography,
    Rating,
} from '@mui/material';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import SaveIcon from '@mui/icons-material/Save';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import LockIcon from '@mui/icons-material/Lock';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import ReplayIcon from '@mui/icons-material/Replay';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import VisibilityIcon from '@mui/icons-material/Visibility';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { Link } from '@tanstack/react-router';
import AppShell from '../layout/AppShell.tsx';
import {
    fetchRSEDetail,
    fetchSessionEmployees,
    fetchEvaluations,
    bulkUpdateEvaluations,
    markReviewed,
    revertRSE,
    reopenRSE,
    fetchLanguageLevels,
    fetchEmployeeLanguageProfile,
    saveEmployeeLanguageProfile,
    saveRSEFields,
    type Evaluation,
    type EvaluationBulkUpdate,
    type EmployeeLanguageInput,
    type RSEFieldsUpdate,
} from './peopleReviewApi';
import useString from '../../hooks/useString';
import { str } from '../../strings/str';
import type { GetStringFn } from '../../types/getStringFn';
import { useTheme } from '../theme/ThemeContext';

const DIMENSION_COLORS: Record<string, string> = {
    TRANSFORMATION:   '#1565C0',
    ETHICS:           '#2E7D32',
    MOBILIZATION:     '#E65100',
    PEOPLE_PLANET:    '#0097A7',
    OPENNESS:         '#D32F2F',
    CUSTOMER_RESULTS: '#AD1457',
};
const FALLBACK_COLORS = ['#1565C0','#2E7D32','#E65100','#0097A7','#6A1B9A','#AD1457','#0277BD','#558B2F'];

function getDimColor(key: string, idx: number) {
    return DIMENSION_COLORS[key] ?? FALLBACK_COLORS[idx % FALLBACK_COLORS.length];
}

// Map a review dimension key to its translation key (key competences).
const DIMENSION_STRING_KEYS: Record<string, string> = {
    TRANSFORMATION:   'competenceTransformation',
    ETHICS:           'competenceEthics',
    MOBILIZATION:     'competenceMobilization',
    PEOPLE_PLANET:    'competencePeoplePlanet',
    OPENNESS:         'competenceOpenness',
    CUSTOMER_RESULTS: 'competenceCustomerResults',
};

/** Translated competence name, falling back to the DB-provided dimension name. */
function competenceName(getString: GetStringFn, key: string, fallback: string): string {
    const strKey = DIMENSION_STRING_KEYS[key];
    if (!strKey) return fallback;
    const label = getString(strKey);
    return label && label !== strKey ? label : fallback;
}

// Map a review dimension key to its hint translation key.
const DIMENSION_HINT_KEYS: Record<string, string> = {
    TRANSFORMATION:   'competenceHintTransformation',
    ETHICS:           'competenceHintEthics',
    MOBILIZATION:     'competenceHintMobilization',
    PEOPLE_PLANET:    'competenceHintPeoplePlanet',
    OPENNESS:         'competenceHintOpenness',
    CUSTOMER_RESULTS: 'competenceHintCustomerResults',
};

/** Translated competence hint (multi-line), falling back to the DB description. */
function competenceHint(getString: GetStringFn, key: string, fallback: string): string {
    const strKey = DIMENSION_HINT_KEYS[key];
    if (!strKey) return fallback;
    const hint = getString(strKey);
    return hint && hint !== strKey ? hint : fallback;
}

interface LocalEval {
    id: number;
    dimension_id: number;
    dimension_name: string;
    dimension_key: string;
    dimension_description: string | null;
    dimension_is_active: boolean;
    score: number | null;
    facts: string[];
    improvement: string;
}

/** Split a stored facts string (e.g. "1. fact one\n2. fact two") into an array, stripping numbering. */
function parseFacts(raw: string | null): string[] {
    if (!raw) return [];
    return raw
        .split('\n')
        .map(line => line.replace(/^\d+\.\s*/, '').trim())
        .filter(line => line.length > 0);
}

/** Serialize a facts array back to a numbered string for storage. */
function serializeFacts(facts: string[]): string {
    if (facts.length === 0) return '';
    return facts.map((f, i) => `${i + 1}. ${f}`).join('\n');
}

function DimensionChart({ evals, getString }: { evals: LocalEval[]; getString: GetStringFn }) {
    return (
        <Box>
            {evals.map((e, idx) => {
                const color = getDimColor(e.dimension_key, idx);
                const pct = ((e.score ?? 0) / 5) * 100;
                return (
                    <Box key={e.id} sx={{ display: 'flex', alignItems: 'center', mb: 1, gap: 1 }}>
                        <Typography fontSize={11} fontWeight={600} sx={{ width: 180, flexShrink: 0, color }} noWrap>
                            {competenceName(getString, e.dimension_key, e.dimension_name)}
                        </Typography>
                        <Box sx={{ flex: 1, height: 10, borderRadius: 5, bgcolor: `${color}22`, position: 'relative' }}>
                            <Box sx={{
                                position: 'absolute', left: 0, top: 0, bottom: 0,
                                width: `${pct}%`, borderRadius: 5, bgcolor: color,
                                transition: 'width 0.4s ease',
                            }} />
                        </Box>
                        <Typography fontSize={11} fontWeight={700} sx={{ width: 28, textAlign: 'right', color }}>
                            {e.score ?? '—'}/5
                        </Typography>
                    </Box>
                );
            })}
        </Box>
    );
}

function CompetenceSummarySection({
    title, accent, options, candidates, nameOf, colorOf, isEditable, getString,
    drafts, onDraftChange, onAddOption, onRemoveOption, onAddComment, onRemoveComment,
}: {
    title: string;
    accent: string;
    options: SummaryOption[];
    candidates: { key: string; name: string }[];
    nameOf: (key: string) => string;
    colorOf: (key: string) => string;
    isEditable: boolean;
    getString: GetStringFn;
    drafts: Record<string, string>;
    onDraftChange: (key: string, value: string) => void;
    onAddOption: (key: string) => void;
    onRemoveOption: (key: string) => void;
    onAddComment: (key: string, text: string) => void;
    onRemoveComment: (key: string, index: number) => void;
}) {
    const [pick, setPick] = useState('');

    const submitComment = (key: string) => {
        const text = (drafts[key] ?? '').trim();
        if (!text) return;
        onAddComment(key, text);
        onDraftChange(key, '');
    };

    return (
        <Box sx={{ flex: '1 1 340px', minWidth: 300 }}>
            <Typography fontSize={11} fontWeight={700} color={accent} mb={1.5} textTransform="uppercase" letterSpacing="0.06em">
                {title}
            </Typography>

            {isEditable && candidates.length > 0 && (
                <Stack direction="row" spacing={1} mb={2}>
                    <FormControl size="small" sx={{ flex: 1, minWidth: 0 }}>
                        <InputLabel id={`add-${title}-label`}>{getString('selectCompetence')}</InputLabel>
                        <Select
                            variant="outlined"
                            labelId={`add-${title}-label`}
                            label={getString('selectCompetence')}
                            value={pick}
                            onChange={e => setPick(e.target.value)}
                        >
                            {candidates.map(c => (
                                <MenuItem key={c.key} value={c.key}>{c.name}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <Button
                        variant="outlined" size="small" startIcon={<AddIcon />}
                        onClick={() => { if (pick) { onAddOption(pick); setPick(''); } }}
                        disabled={!pick}
                        sx={{ textTransform: 'none', whiteSpace: 'nowrap' }}
                    >
                        {getString('addFact')}
                    </Button>
                </Stack>
            )}

            <Stack spacing={1.5}>
                {options.map(opt => {
                    const color = colorOf(opt.dimension_key);
                    return (
                    <Box key={opt.dimension_key} sx={{ border: `1px solid ${color}33`, borderRadius: '10px', p: 1.5 }}>
                        <Stack direction="row" alignItems="center" justifyContent="space-between" mb={1}>
                            <Typography fontSize={13} fontWeight={700} color={color}>
                                {nameOf(opt.dimension_key)}
                            </Typography>
                            {isEditable && (
                                <Tooltip title={getString('removeOption')}>
                                    <IconButton size="small" onClick={() => onRemoveOption(opt.dimension_key)} sx={{ p: 0.25 }}>
                                        <CloseIcon sx={{ fontSize: 16 }} />
                                    </IconButton>
                                </Tooltip>
                            )}
                        </Stack>

                        {opt.comments.length > 0 && (
                            <Box sx={{ mb: 1 }}>
                                {opt.comments.map((comment, idx) => (
                                    <Stack
                                        key={`${opt.dimension_key}-c-${idx}`}
                                        direction="row" alignItems="flex-start" spacing={0.5}
                                        sx={{ mb: 0.5, py: 0.25, px: 0.5, borderRadius: '6px', '&:hover': { bgcolor: color + '10' } }}
                                    >
                                        <Typography fontSize={12} fontWeight={700} color={color} sx={{ minWidth: 20, pt: '2px' }}>
                                            {idx + 1}.
                                        </Typography>
                                        <Typography fontSize={13} sx={{ flex: 1, pt: '2px', wordBreak: 'break-word' }}>
                                            {comment}
                                        </Typography>
                                        {isEditable && (
                                            <Tooltip title={getString('deleteComment')}>
                                                <IconButton size="small" onClick={() => onRemoveComment(opt.dimension_key, idx)} sx={{ p: 0.25, mt: '-2px' }}>
                                                    <CloseIcon sx={{ fontSize: 13 }} />
                                                </IconButton>
                                            </Tooltip>
                                        )}
                                    </Stack>
                                ))}
                            </Box>
                        )}

                        {isEditable && (
                            <Stack direction="row" spacing={2} alignItems="flex-start">
                                <TextField
                                    size="small"
                                    multiline minRows={2}
                                    placeholder={getString('typeCommentPlaceholder')}
                                    value={drafts[opt.dimension_key] ?? ''}
                                    onChange={e => onDraftChange(opt.dimension_key, e.target.value)}
                                    fullWidth
                                />
                                <Button
                                    variant="outlined" size="small" startIcon={<AddIcon />}
                                    onClick={() => submitComment(opt.dimension_key)}
                                    disabled={!(drafts[opt.dimension_key] ?? '').trim()}
                                    sx={{ textTransform: 'none', whiteSpace: 'nowrap', mt: 0.25 }}
                                >
                                    {getString('addComment')}
                                </Button>
                            </Stack>
                        )}
                    </Box>
                    );
                })}
            </Stack>
        </Box>
    );
}

const RSE_STATUS_COLORS: Record<string, string> = {
    open: '#1565C0',
    reviewed: '#E65100',
    closed: '#2E7D32',
};

// Fixed set of foreign languages the employee declares a level for.
const FOREIGN_LANGUAGES: { key: string; labelKey: 'english' | 'french' }[] = [
    { key: 'english', labelKey: 'english' },
    { key: 'french', labelKey: 'french' },
];

// Individual development plan — number of mission boxes (hardcoded for now,
// stored as a JSON array so this can grow later without a schema change).
const MISSION_COUNT = 2;

/** Parse the stored development plan (JSON array) into a string[] padded to `count`. */
function parseMissions(raw: string | null, count: number): string[] {
    let arr: string[] = [];
    if (raw) {
        try {
            const parsed: unknown = JSON.parse(raw);
            if (Array.isArray(parsed)) arr = parsed.map(x => (x == null ? '' : String(x)));
        } catch {
            /* not JSON yet — start empty */
        }
    }
    const out = [...arr];
    while (out.length < count) out.push('');
    return out;
}

// One picked competence in the summary, with its linked comments.
interface SummaryOption {
    dimension_key: string;
    comments: string[];
}

/** Minimum number of competences each summary select should offer. */
const SUMMARY_MIN_OPTIONS = 2;

/** Parse a stored {strong, develop} summary array for one side. */
function parseSummarySide(raw: unknown): SummaryOption[] {
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
 * Always offers at least SUMMARY_MIN_OPTIONS, plus any tied at the boundary score
 * — up to all of them when scores are equal.
 */
function rankedCompetences(evals: LocalEval[], direction: 'desc' | 'asc'): LocalEval[] {
    if (evals.length <= SUMMARY_MIN_OPTIONS) return [...evals];
    const sorted = [...evals].sort((a, b) =>
        direction === 'desc' ? (b.score ?? 0) - (a.score ?? 0) : (a.score ?? 0) - (b.score ?? 0),
    );
    const threshold = sorted[SUMMARY_MIN_OPTIONS - 1].score ?? 0;
    return sorted.filter(e =>
        direction === 'desc' ? (e.score ?? 0) >= threshold : (e.score ?? 0) <= threshold,
    );
}

export function EvaluationPage() {
    const { rseId } = useParams({ strict: false }) as { rseId: string };
    const navigate = useNavigate();
    const qc = useQueryClient();
    const rid = Number(rseId);
    const { t } = useTheme();
    const getString = useString({ str });

    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
    const [localEvals, setLocalEvals] = useState<LocalEval[]>([]);
    const [activeTab, setActiveTab] = useState(0);
    const [newFactTexts, setNewFactTexts] = useState<Record<number, string>>({});

    const { data: rseDetail, isLoading: rseLoading } = useQuery({
        queryKey: ['rse_detail', rid],
        queryFn: () => fetchRSEDetail(rid),
        staleTime: 30_000,
        enabled: !!rid,
    });

    // Fetch sibling employees for prev/next navigation
    const sessionId = rseDetail?.session_id;
    const { data: siblings = [] } = useQuery({
        queryKey: ['session_employees', sessionId],
        queryFn: () => fetchSessionEmployees(sessionId!),
        staleTime: 30_000,
        enabled: !!sessionId,
    });

    const { data: evaluations = [], isLoading: evalLoading } = useQuery({
        queryKey: ['evaluations', rid],
        queryFn: () => fetchEvaluations(rid),
        staleTime: 30_000,
        enabled: !!rid,
    });

    // --- Foreign languages ---
    const employeeId = rseDetail?.employee_id;
    const { data: langLevels = [] } = useQuery({
        queryKey: ['language_levels'],
        queryFn: fetchLanguageLevels,
        staleTime: 5 * 60_000,
    });
    const { data: langProfile } = useQuery({
        queryKey: ['employee_language_profile', employeeId],
        queryFn: () => fetchEmployeeLanguageProfile(employeeId!),
        staleTime: 30_000,
        enabled: !!employeeId,
    });
    // Selected level id per language key (null = not specified).
    const [langSel, setLangSel] = useState<Record<string, number | null>>({
        english: null,
        french: null,
    });

    useEffect(() => {
        if (langProfile) {
            const next: Record<string, number | null> = { english: null, french: null };
            for (const l of langProfile.languages) {
                next[l.language] = l.level_id;
            }
            setLangSel(next);
        }
    }, [langProfile]);

    const langMut = useMutation({
        mutationFn: (languages: EmployeeLanguageInput[]) =>
            saveEmployeeLanguageProfile(employeeId!, languages),
        onSuccess: async () => {
            await qc.invalidateQueries({ queryKey: ['employee_language_profile', employeeId] });
        },
        onError: (err: Error) => setSnackbar({ open: true, message: err.message, severity: 'error' }),
    });

    // --- Employee data tabs (languages / feedback / results) ---
    const [dataTab, setDataTab] = useState(0);
    const [employeeFeedback, setEmployeeFeedback] = useState('');
    const [managerFeedback, setManagerFeedback] = useState('');
    const [results, setResults] = useState<string[]>([]);
    const [newResultText, setNewResultText] = useState('');
    const [missions, setMissions] = useState<string[]>(() => parseMissions(null, MISSION_COUNT));
    const [trainings, setTrainings] = useState('');
    // Competence summary (analysis tab 2): strong / to-develop picked competences.
    const [analysisTab, setAnalysisTab] = useState(0);
    const [strongOptions, setStrongOptions] = useState<SummaryOption[]>([]);
    const [developOptions, setDevelopOptions] = useState<SummaryOption[]>([]);
    // Comment-input drafts per section, lifted here so dimension facts can push into them.
    const [strongDrafts, setStrongDrafts] = useState<Record<string, string>>({});
    const [developDrafts, setDevelopDrafts] = useState<Record<string, string>>({});

    useEffect(() => {
        if (rseDetail) {
            setEmployeeFeedback(rseDetail.employee_feedback ?? '');
            setManagerFeedback(rseDetail.manager_feedback ?? '');
            setResults(parseFacts(rseDetail.results_achievements));
            setMissions(parseMissions(rseDetail.development_plan, MISSION_COUNT));
            setTrainings(rseDetail.trainings ?? '');
            let summary: { strong?: unknown; develop?: unknown } = {};
            if (rseDetail.competence_summary) {
                try { summary = JSON.parse(rseDetail.competence_summary); } catch { summary = {}; }
            }
            setStrongOptions(parseSummarySide(summary.strong));
            setDevelopOptions(parseSummarySide(summary.develop));
        }
    }, [rseDetail]);

    const rseFieldsMut = useMutation({
        mutationFn: (fields: RSEFieldsUpdate) => saveRSEFields(rid, fields),
        onSuccess: async () => {
            await qc.invalidateQueries({ queryKey: ['rse_detail', rid] });
        },
        onError: (err: Error) => setSnackbar({ open: true, message: err.message, severity: 'error' }),
    });

    const addResult = (text: string) => {
        const trimmed = text.trim();
        if (!trimmed) return;
        setResults(prev => [...prev, trimmed]);
        setNewResultText('');
    };

    const removeResult = (index: number) => {
        setResults(prev => prev.filter((_, i) => i !== index));
    };

    useEffect(() => {
        if (evaluations.length > 0) {
            setLocalEvals(evaluations.map((e: Evaluation) => ({
                id: e.id,
                dimension_id: e.dimension_id,
                dimension_name: e.dimension_name,
                dimension_key: e.dimension_key,
                dimension_description: e.dimension_description ?? null,
                dimension_is_active: e.dimension_is_active,
                score: e.score,
                facts: parseFacts(e.facts),
                improvement: e.improvement ?? '',
            })));
        }
    }, [evaluations]);

    const saveMut = useMutation({
        mutationFn: bulkUpdateEvaluations,
        onSuccess: async (res) => {
            await qc.invalidateQueries({ queryKey: ['evaluations', rid] });
            await qc.invalidateQueries({ queryKey: ['session_employees', sessionId] });
            setSnackbar({ open: true, message: res.detail, severity: 'success' });
        },
        onError: (err: Error) => setSnackbar({ open: true, message: err.message, severity: 'error' }),
    });

    const reviewedMut = useMutation({
        mutationFn: markReviewed,
        onSuccess: async (res) => {
            await qc.invalidateQueries({ queryKey: ['rse_detail', rid] });
            await qc.invalidateQueries({ queryKey: ['session_employees', sessionId] });
            setSnackbar({ open: true, message: res.detail, severity: 'success' });
        },
        onError: (err: Error) => setSnackbar({ open: true, message: err.message, severity: 'error' }),
    });

    const revertMut = useMutation({
        mutationFn: revertRSE,
        onSuccess: async (res) => {
            await qc.invalidateQueries({ queryKey: ['rse_detail', rid] });
            await qc.invalidateQueries({ queryKey: ['session_employees', sessionId] });
            setSnackbar({ open: true, message: res.detail, severity: 'success' });
        },
        onError: (err: Error) => setSnackbar({ open: true, message: err.message, severity: 'error' }),
    });

    const reopenMut = useMutation({
        mutationFn: reopenRSE,
        onSuccess: async (res) => {
            await qc.invalidateQueries({ queryKey: ['rse_detail', rid] });
            await qc.invalidateQueries({ queryKey: ['session_employees', sessionId] });
            setSnackbar({ open: true, message: res.detail, severity: 'success' });
        },
        onError: (err: Error) => setSnackbar({ open: true, message: err.message, severity: 'error' }),
    });

    // Prev / Next employee navigation
    const siblingIds = siblings.map(s => s.id);
    const currentIdx = siblingIds.indexOf(rid);
    const prevId = currentIdx > 0 ? siblingIds[currentIdx - 1] : null;
    const nextId = currentIdx < siblingIds.length - 1 ? siblingIds[currentIdx + 1] : null;

    const goToEmployee = (id: number) => {
        navigate({ to: '/people-review/evaluation/$rseId' as any, params: { rseId: String(id) } });
    };

    const isLoading = rseLoading || evalLoading;
    const sessionStatus = rseDetail?.session_status ?? 'open';
    // Editable only if BOTH session is open AND employee status is open
    const isEditable = rseDetail?.status === 'open' && sessionStatus === 'open';
    const isSessionClosed = sessionStatus === 'closed';

    // In a closed session show every dimension; otherwise only active ones.
    const visibleEvals = isSessionClosed ? localEvals : localEvals.filter(e => e.dimension_is_active);

    const allFilled = visibleEvals.length > 0 && visibleEvals.every(e => (e.score ?? 0) > 0);
    const filledCount = visibleEvals.filter(e => (e.score ?? 0) > 0).length;
    const totalCount = visibleEvals.length;

    const competenceLabel = (key: string) => {
        const ev = localEvals.find(e => e.dimension_key === key);
        return competenceName(getString, key, ev?.dimension_name ?? key);
    };

    // Same color a competence gets in the dimension tabs below (same source).
    const competenceColor = (key: string) => {
        const idx = visibleEvals.findIndex(e => e.dimension_key === key);
        return getDimColor(key, idx >= 0 ? idx : 0);
    };

    // Translate CEFR level label/hint by code, falling back to the DB value.
    const translatedOr = (key: string, fallback: string) => {
        const v = getString(key);
        return v && v !== key ? v : fallback;
    };
    const langLevelLabel = (code: string, fallback: string) => translatedOr(`langLevelLabel${code}`, fallback);
    const langLevelHint = (code: string, fallback: string) => translatedOr(`langLevelHint${code}`, fallback);

    // A competence is "picked" if it appears in either summary section.
    const isStrongPicked = (key: string) => strongOptions.some(o => o.dimension_key === key);
    const isDevelopPicked = (key: string) => developOptions.some(o => o.dimension_key === key);
    const isCompetencePicked = (key: string) => isStrongPicked(key) || isDevelopPicked(key);

    // Copy a fact into the comment-input draft(s) of the matching summary option(s).
    const appendDraft = (setter: Dispatch<SetStateAction<Record<string, string>>>, key: string, text: string) =>
        setter(prev => ({ ...prev, [key]: prev[key] ? `${prev[key]}\n${text}` : text }));
    const copyFactToSummary = (key: string, text: string) => {
        if (isStrongPicked(key)) appendDraft(setStrongDrafts, key, text);
        if (isDevelopPicked(key)) appendDraft(setDevelopDrafts, key, text);
    };

    // Summary select candidates: top/bottom scored, excluding already-picked ones.
    const strongCandidates = rankedCompetences(visibleEvals, 'desc')
        .filter(e => !strongOptions.some(o => o.dimension_key === e.dimension_key))
        .map(e => ({ key: e.dimension_key, name: competenceLabel(e.dimension_key) }));
    const developCandidates = rankedCompetences(visibleEvals, 'asc')
        .filter(e => !developOptions.some(o => o.dimension_key === e.dimension_key))
        .map(e => ({ key: e.dimension_key, name: competenceLabel(e.dimension_key) }));

    const activeEval = visibleEvals[activeTab];
    const activeColor = activeEval ? getDimColor(activeEval.dimension_key, activeTab) : t.accent;

    const handleSave = () => {
        const updates: EvaluationBulkUpdate[] = localEvals.map(le => ({
            id: le.id, score: le.score, facts: serializeFacts(le.facts) || null, improvement: le.improvement || null,
        }));
        saveMut.mutate(updates);
        if (employeeId) {
            const languages: EmployeeLanguageInput[] = FOREIGN_LANGUAGES.map(({ key }) => ({
                language: key,
                level_id: langSel[key] ?? null,
            }));
            langMut.mutate(languages);
        }
        const hasMissions = missions.some(m => m.trim());
        const hasSummary = strongOptions.length > 0 || developOptions.length > 0;
        rseFieldsMut.mutate({
            employee_feedback: employeeFeedback || null,
            manager_feedback: managerFeedback || null,
            results_achievements: serializeFacts(results) || null,
            development_plan: hasMissions ? JSON.stringify(missions) : null,
            trainings: trainings || null,
            competence_summary: hasSummary
                ? JSON.stringify({ strong: strongOptions, develop: developOptions })
                : null,
        });
    };

    const updateMission = (index: number, value: string) => {
        setMissions(prev => prev.map((m, i) => (i === index ? value : m)));
    };

    // --- Competence summary helpers (shared by both sections) ---
    type SummarySetter = Dispatch<SetStateAction<SummaryOption[]>>;
    const addSummaryOption = (setter: SummarySetter, key: string) =>
        setter(prev => (prev.some(o => o.dimension_key === key) ? prev : [...prev, { dimension_key: key, comments: [] }]));
    const removeSummaryOption = (setter: SummarySetter, key: string) =>
        setter(prev => prev.filter(o => o.dimension_key !== key));
    const addSummaryComment = (setter: SummarySetter, key: string, text: string) =>
        setter(prev => prev.map(o => (o.dimension_key === key ? { ...o, comments: [...o.comments, text.trim()] } : o)));
    const removeSummaryComment = (setter: SummarySetter, key: string, index: number) =>
        setter(prev => prev.map(o => (o.dimension_key === key ? { ...o, comments: o.comments.filter((_, i) => i !== index) } : o)));

    const updateLocal = (id: number, field: keyof LocalEval, value: unknown) => {
        setLocalEvals(prev => prev.map(e => e.id === id ? { ...e, [field]: value } : e));
    };

    const addFact = (evalId: number, text: string) => {
        const trimmed = text.trim();
        if (!trimmed) return;
        setLocalEvals(prev => prev.map(e =>
            e.id === evalId ? { ...e, facts: [...e.facts, trimmed] } : e,
        ));
        setNewFactTexts(prev => ({ ...prev, [evalId]: '' }));
    };

    const removeFact = (evalId: number, index: number) => {
        setLocalEvals(prev => prev.map(e =>
            e.id === evalId ? { ...e, facts: e.facts.filter((_, i) => i !== index) } : e,
        ));
    };

    if (isLoading) {
        return (
            <AppShell>
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 6 }}><CircularProgress /></Box>
            </AppShell>
        );
    }

    return (
        <AppShell>
            <Box sx={{ p: { xs: 2, sm: 3 }, maxWidth: 1400, mx: 'auto' }}>

                {/* Breadcrumbs */}
                <Breadcrumbs separator={<NavigateNextIcon fontSize="small" />} sx={{ mb: 3 }}>
                    <Link to="/people-review" style={{ textDecoration: 'none', color: 'inherit' }}>
                        <Typography variant="body2" color="text.secondary">People Review</Typography>
                    </Link>
                    {rseDetail && (
                        <Link
                            to={`/people-review/${rseDetail.session_id}` as any}
                            style={{ textDecoration: 'none', color: 'inherit' }}
                        >
                            <Typography variant="body2" color="text.secondary">
                                {rseDetail.session_name || `Session #${rseDetail.session_id}`}
                            </Typography>
                        </Link>
                    )}
                    <Typography variant="body2" color="text.primary" fontWeight={600}>
                        {rseDetail?.employee_name ?? `#${rid}`}
                    </Typography>
                </Breadcrumbs>

                {rseDetail && (
                    <>
                        {/* Header row */}
                        <Box sx={{ mb: 2.5, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
                            <Box>
                                <Stack direction="row" alignItems="center" spacing={1.5}>
                                    <Typography variant="h5" fontWeight={700} color={t.text}>
                                        {rseDetail.employee_name}
                                    </Typography>
                                    <Chip
                                        label={rseDetail.status}
                                        size="small"
                                        sx={{
                                            fontWeight: 700, fontSize: 11,
                                            bgcolor: `${RSE_STATUS_COLORS[rseDetail.status] ?? '#888'}18`,
                                            color: RSE_STATUS_COLORS[rseDetail.status] ?? '#888',
                                        }}
                                    />
                                    {isSessionClosed && (
                                        <Chip
                                            icon={<VisibilityIcon sx={{ fontSize: 13 }} />}
                                            label="View only"
                                            size="small"
                                            variant="outlined"
                                            sx={{ fontSize: 11 }}
                                        />
                                    )}
                                </Stack>
                                <Typography variant="body2" color={t.textMuted} mt={0.3}>
                                    {rseDetail.employee_code} · {rseDetail.session_name}
                                </Typography>
                            </Box>

                            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                                {/* Progress */}
                                <Box sx={{ textAlign: 'right', mr: 0.5 }}>
                                    <Typography fontSize={12} fontWeight={700} color={allFilled ? '#2E7D32' : t.textMuted}>
                                        {filledCount}/{totalCount} filled
                                    </Typography>
                                    <Box sx={{ width: 120, height: 5, borderRadius: 3, bgcolor: `${t.accent}22` }}>
                                        <Box sx={{
                                            height: '100%', borderRadius: 3,
                                            width: totalCount ? `${(filledCount / totalCount) * 100}%` : '0%',
                                            bgcolor: allFilled ? '#2E7D32' : t.accent,
                                            transition: 'width 0.3s',
                                        }} />
                                    </Box>
                                </Box>

                                {/* Mark reviewed */}
                                {isEditable && (
                                    <Tooltip
                                        title={allFilled ? 'Mark as reviewed' : `Fill all ${totalCount} dimensions (${filledCount}/${totalCount})`}
                                        placement="top"
                                    >
                                        <span>
                                            <Button
                                                size="small" variant="contained"
                                                startIcon={allFilled ? <CheckCircleIcon /> : <LockIcon />}
                                                onClick={() => reviewedMut.mutate(rid)}
                                                disabled={!allFilled || reviewedMut.isPending}
                                                sx={{
                                                    borderRadius: '8px', textTransform: 'none', fontWeight: 600, fontSize: 12,
                                                    bgcolor: allFilled ? '#2E7D32' : undefined,
                                                    '&:hover': { bgcolor: allFilled ? '#1B5E20' : undefined },
                                                }}
                                            >
                                                Mark Reviewed
                                            </Button>
                                        </span>
                                    </Tooltip>
                                )}

                                {/* Revert buttons */}
                                {rseDetail.status === 'reviewed' && sessionStatus === 'open' && (
                                    <Tooltip title="Revert to open (allow editing again)">
                                        <Button
                                            size="small" variant="outlined" startIcon={<ReplayIcon />}
                                            onClick={() => revertMut.mutate(rid)}
                                            disabled={revertMut.isPending}
                                            sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 600, fontSize: 12 }}
                                        >
                                            Revert to Open
                                        </Button>
                                    </Tooltip>
                                )}
                                {rseDetail.status === 'closed' && sessionStatus !== 'closed' && (
                                    <>
                                        <Tooltip title="Revert one step back to reviewed">
                                            <Button
                                                size="small" variant="outlined" color="warning" startIcon={<ReplayIcon />}
                                                onClick={() => revertMut.mutate(rid)}
                                                disabled={revertMut.isPending}
                                                sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 600, fontSize: 12 }}
                                            >
                                                Revert
                                            </Button>
                                        </Tooltip>
                                        <Tooltip title="Set directly to open (skip reviewed)">
                                            <Button
                                                size="small" variant="outlined" startIcon={<ReplayIcon />}
                                                onClick={() => reopenMut.mutate(rid)}
                                                disabled={reopenMut.isPending}
                                                sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 600, fontSize: 12 }}
                                            >
                                                Set Open
                                            </Button>
                                        </Tooltip>
                                    </>
                                )}

                                {/* Save */}
                                {isEditable && (
                                    <Button
                                        size="small" variant="outlined" startIcon={<SaveIcon />}
                                        onClick={handleSave} disabled={saveMut.isPending}
                                        sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 600, fontSize: 12 }}
                                    >
                                        {saveMut.isPending ? 'Saving…' : 'Save'}
                                    </Button>
                                )}

                                {/* Prev / Next employee */}
                                <Box sx={{ display: 'flex', gap: 0.5 }}>
                                    <Tooltip title={prevId ? `Previous employee` : 'No previous'}>
                                        <span>
                                            <IconButton
                                                size="small" disabled={!prevId}
                                                onClick={() => prevId && goToEmployee(prevId)}
                                                sx={{ border: `1px solid ${t.borderLight}`, borderRadius: '7px' }}
                                            >
                                                <ArrowBackIosNewIcon sx={{ fontSize: 14 }} />
                                            </IconButton>
                                        </span>
                                    </Tooltip>
                                    <Tooltip title={nextId ? `Next employee` : 'No next'}>
                                        <span>
                                            <IconButton
                                                size="small" disabled={!nextId}
                                                onClick={() => nextId && goToEmployee(nextId)}
                                                sx={{ border: `1px solid ${t.borderLight}`, borderRadius: '7px' }}
                                            >
                                                <ArrowForwardIosIcon sx={{ fontSize: 14 }} />
                                            </IconButton>
                                        </span>
                                    </Tooltip>
                                    {siblings.length > 0 && (
                                        <Typography fontSize={11} color={t.textMuted} alignSelf="center" ml={0.5}>
                                            {currentIdx + 1}/{siblings.length}
                                        </Typography>
                                    )}
                                </Box>
                            </Stack>
                        </Box>

                        {/* View-only banner */}
                        {isSessionClosed && (
                            <Alert severity="info" icon={<VisibilityIcon />} sx={{ mb: 2, borderRadius: '10px' }}>
                                This session is <strong>closed</strong> — view-only mode. Revert the session to allow edits.
                            </Alert>
                        )}
                        {!isSessionClosed && rseDetail.status !== 'open' && (
                            <Alert severity="warning" sx={{ mb: 2, borderRadius: '10px' }}>
                                Employee status is <strong>{rseDetail.status}</strong> — use "Revert" to allow editing again.
                            </Alert>
                        )}

                        {/* Employee data tabs: languages / feedback / results */}
                        <Box sx={{ mb: 3, border: `1px solid ${t.borderLight}`, borderRadius: '12px', overflow: 'hidden', background: t.cardBg }}>
                            <Tabs
                                value={dataTab}
                                onChange={(_, v) => setDataTab(v)}
                                variant="scrollable"
                                scrollButtons="auto"
                                sx={{ borderBottom: `1px solid ${t.borderLight}` }}
                            >
                                <Tab label={getString('foreignLanguages')} sx={{ textTransform: 'none', fontWeight: 600, fontSize: 12 }} />
                                <Tab label={getString('employeeFeedback')} sx={{ textTransform: 'none', fontWeight: 600, fontSize: 12 }} />
                                <Tab label={getString('managerFeedback')} sx={{ textTransform: 'none', fontWeight: 600, fontSize: 12 }} />
                                <Tab label={getString('resultsAchievements')} sx={{ textTransform: 'none', fontWeight: 600, fontSize: 12 }} />
                                <Tab label={getString('developmentPlan')} sx={{ textTransform: 'none', fontWeight: 600, fontSize: 12 }} />
                                <Tab label={getString('requiredTrainings')} sx={{ textTransform: 'none', fontWeight: 600, fontSize: 12 }} />
                            </Tabs>

                            <Box sx={{ p: 3 }}>
                                {dataTab === 0 && (
                                    <>
                                        <Typography fontSize={12} color={t.textMuted} mb={2}>
                                            {getString('foreignLanguagesHint')}
                                        </Typography>
                                        <Stack spacing={2}>
                                {FOREIGN_LANGUAGES.map(({ key, labelKey }) => {
                                    const selId = langSel[key] ?? null;
                                    const selected = langLevels.find(l => l.id === selId);
                                    return (
                                        <Box key={key}>
                                            <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
                                                <Typography fontSize={13} fontWeight={600} color={t.textSecondary} sx={{ width: 120, flexShrink: 0 }}>
                                                    {getString(labelKey)}
                                                </Typography>
                                                <FormControl size="small" sx={{ minWidth: 260 }}>
                                                    <InputLabel id={`lang-${key}-label`}>{getString('selectLevel')}</InputLabel>
                                                    <Select
                                                        variant="outlined"
                                                        labelId={`lang-${key}-label`}
                                                        label={getString('selectLevel')}
                                                        value={selId == null ? '' : String(selId)}
                                                        disabled={!isEditable}
                                                        onChange={(e) => {
                                                            const v = e.target.value;
                                                            setLangSel(prev => ({ ...prev, [key]: v === '' ? null : Number(v) }));
                                                        }}
                                                    >
                                                        <MenuItem value=""><em>—</em></MenuItem>
                                                        {langLevels.map(l => {
                                                            const label = langLevelLabel(l.code, l.label);
                                                            return (
                                                                <MenuItem key={l.id} value={String(l.id)}>
                                                                    {l.code}{label ? ` · ${label}` : ''}
                                                                </MenuItem>
                                                            );
                                                        })}
                                                    </Select>
                                                </FormControl>
                                            </Stack>
                                            {selected?.hint && (
                                                <Alert
                                                    severity="info"
                                                    icon={<InfoOutlinedIcon fontSize="small" />}
                                                    sx={{ mt: 1, borderRadius: '10px', py: 0.25 }}
                                                >
                                                    <strong>{selected.code}</strong> — {langLevelHint(selected.code, selected.hint)}
                                                </Alert>
                                            )}
                                        </Box>
                                    );
                                })}
                                        </Stack>
                                    </>
                                )}

                                {dataTab === 1 && (
                                    <TextField
                                        label={getString('employeeFeedback')}
                                        value={employeeFeedback}
                                        onChange={e => setEmployeeFeedback(e.target.value)}
                                        fullWidth multiline minRows={5}
                                        disabled={!isEditable}
                                    />
                                )}

                                {dataTab === 2 && (
                                    <TextField
                                        label={getString('managerFeedback')}
                                        value={managerFeedback}
                                        onChange={e => setManagerFeedback(e.target.value)}
                                        fullWidth multiline minRows={5}
                                        disabled={!isEditable}
                                    />
                                )}

                                {dataTab === 3 && (
                                    <Box>
                                        {results.length > 0 && (
                                            <Box sx={{ mb: 1.5 }}>
                                                {results.map((item, idx) => (
                                                    <Stack
                                                        key={`result-${idx}`}
                                                        direction="row"
                                                        alignItems="flex-start"
                                                        spacing={0.5}
                                                        sx={{ mb: 0.5, py: 0.5, px: 0.75, borderRadius: '6px', '&:hover': { bgcolor: t.accent + '10' } }}
                                                    >
                                                        <Typography fontSize={12} fontWeight={700} color={t.accent} sx={{ minWidth: 22, pt: '2px' }}>
                                                            {idx + 1}.
                                                        </Typography>
                                                        <Typography fontSize={13} sx={{ flex: 1, pt: '2px', wordBreak: 'break-word' }}>
                                                            {item}
                                                        </Typography>
                                                        {isEditable && (
                                                            <Tooltip title={getString('deleteFact')}>
                                                                <IconButton size="small" onClick={() => removeResult(idx)} sx={{ p: 0.25, mt: '-2px' }}>
                                                                    <CloseIcon sx={{ fontSize: 14 }} />
                                                                </IconButton>
                                                            </Tooltip>
                                                        )}
                                                    </Stack>
                                                ))}
                                            </Box>
                                        )}
                                        {isEditable && (
                                            <Stack direction="row" spacing={1}>
                                                <TextField
                                                    size="small"
                                                    placeholder={getString('typeFactPlaceholder')}
                                                    value={newResultText}
                                                    onChange={e => setNewResultText(e.target.value)}
                                                    onKeyDown={e => {
                                                        if (e.key === 'Enter' && !e.shiftKey) {
                                                            e.preventDefault();
                                                            addResult(newResultText);
                                                        }
                                                    }}
                                                    fullWidth
                                                />
                                                <Button
                                                    variant="outlined"
                                                    size="small"
                                                    startIcon={<AddIcon />}
                                                    onClick={() => addResult(newResultText)}
                                                    disabled={!newResultText.trim()}
                                                    sx={{ textTransform: 'none', whiteSpace: 'nowrap' }}
                                                >
                                                    {getString('addFact')}
                                                </Button>
                                            </Stack>
                                        )}
                                    </Box>
                                )}

                                {dataTab === 4 && (
                                    <Box>
                                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                                            {missions.map((mission, idx) => (
                                                <TextField
                                                    key={`mission-${idx}`}
                                                    label={getString('mission', { num: idx + 1 })}
                                                    value={mission}
                                                    onChange={e => updateMission(idx, e.target.value)}
                                                    multiline minRows={5}
                                                    disabled={!isEditable}
                                                    sx={{ flex: '1 1 320px', minWidth: 280 }}
                                                />
                                            ))}
                                        </Box>
                                    </Box>
                                )}

                                {dataTab === 5 && (
                                    <TextField
                                        label={getString('requiredTrainings')}
                                        value={trainings}
                                        onChange={e => setTrainings(e.target.value)}
                                        fullWidth multiline minRows={5}
                                        disabled={!isEditable}
                                    />
                                )}
                            </Box>
                        </Box>

                        {/* Scores overview + competence summary tabs */}
                        {visibleEvals.length > 0 && (
                            <Box sx={{ mb: 3, border: `1px solid ${t.borderLight}`, borderRadius: '12px', overflow: 'hidden', background: t.cardBg }}>
                                <Tabs
                                    value={analysisTab}
                                    onChange={(_, v) => setAnalysisTab(v)}
                                    variant="scrollable"
                                    scrollButtons="auto"
                                    sx={{ borderBottom: `1px solid ${t.borderLight}` }}
                                >
                                    <Tab label={getString('scoresOverview')} sx={{ textTransform: 'none', fontWeight: 600, fontSize: 12 }} />
                                    <Tab label={getString('competencesSummary')} sx={{ textTransform: 'none', fontWeight: 600, fontSize: 12 }} />
                                </Tabs>

                                <Box sx={{ p: 2.5 }}>
                                    {analysisTab === 0 && (
                                        <DimensionChart evals={visibleEvals} getString={getString} />
                                    )}

                                    {analysisTab === 1 && (
                                        allFilled ? (
                                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                                                <CompetenceSummarySection
                                                    title={getString('strongCompetences')}
                                                    accent="#00A651"
                                                    options={strongOptions}
                                                    candidates={strongCandidates}
                                                    nameOf={competenceLabel}
                                                    colorOf={competenceColor}
                                                    isEditable={isEditable}
                                                    getString={getString}
                                                    drafts={strongDrafts}
                                                    onDraftChange={(key, value) => setStrongDrafts(prev => ({ ...prev, [key]: value }))}
                                                    onAddOption={key => addSummaryOption(setStrongOptions, key)}
                                                    onRemoveOption={key => removeSummaryOption(setStrongOptions, key)}
                                                    onAddComment={(key, text) => addSummaryComment(setStrongOptions, key, text)}
                                                    onRemoveComment={(key, idx) => removeSummaryComment(setStrongOptions, key, idx)}
                                                />
                                                <CompetenceSummarySection
                                                    title={getString('competencesToDevelop')}
                                                    accent="#E02424"
                                                    options={developOptions}
                                                    candidates={developCandidates}
                                                    nameOf={competenceLabel}
                                                    colorOf={competenceColor}
                                                    isEditable={isEditable}
                                                    getString={getString}
                                                    drafts={developDrafts}
                                                    onDraftChange={(key, value) => setDevelopDrafts(prev => ({ ...prev, [key]: value }))}
                                                    onAddOption={key => addSummaryOption(setDevelopOptions, key)}
                                                    onRemoveOption={key => removeSummaryOption(setDevelopOptions, key)}
                                                    onAddComment={(key, text) => addSummaryComment(setDevelopOptions, key, text)}
                                                    onRemoveComment={(key, idx) => removeSummaryComment(setDevelopOptions, key, idx)}
                                                />
                                            </Box>
                                        ) : (
                                            <Alert severity="info" sx={{ borderRadius: '10px' }}>
                                                {getString('fillAllCompetencesFirst')}
                                            </Alert>
                                        )
                                    )}
                                </Box>
                            </Box>
                        )}

                        {/* Dimension tabs */}
                        {visibleEvals.length > 0 && (
                            <Box sx={{ border: `1px solid ${t.borderLight}`, borderRadius: '12px', overflow: 'hidden', background: t.cardBg }}>
                                <Tabs
                                    value={activeTab}
                                    onChange={(_, v) => setActiveTab(v)}
                                    variant="scrollable"
                                    scrollButtons="auto"
                                    sx={{
                                        borderBottom: `1px solid ${t.borderLight}`,
                                        '& .MuiTabs-indicator': { height: 3, borderRadius: '3px 3px 0 0', bgcolor: activeColor },
                                    }}
                                >
                                    {visibleEvals.map((e, idx) => {
                                        const color = getDimColor(e.dimension_key, idx);
                                        const filled = (e.score ?? 0) > 0;
                                        return (
                                            <Tab
                                                key={e.id}
                                                label={
                                                    <Stack direction="row" spacing={0.75} alignItems="center">
                                                        <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: filled ? color : `${color}44`, flexShrink: 0 }} />
                                                        <span>{competenceName(getString, e.dimension_key, e.dimension_name)}</span>
                                                    </Stack>
                                                }
                                                sx={{
                                                    fontSize: 12,
                                                    fontWeight: activeTab === idx ? 700 : 500,
                                                    color: activeTab === idx ? color : t.textMuted,
                                                    textTransform: 'none',
                                                    minHeight: 48,
                                                    '&.Mui-selected': { color },
                                                }}
                                            />
                                        );
                                    })}
                                </Tabs>

                                {activeEval && (
                                    <Box sx={{ p: 3 }}>
                                        {/* Dimension header + tooltip */}
                                        <Stack direction="row" alignItems="center" spacing={1} mb={2.5}>
                                            <Box sx={{ width: 4, height: 26, borderRadius: 2, bgcolor: activeColor, flexShrink: 0 }} />
                                            <Typography variant="h6" fontWeight={700} color={activeColor}>
                                                {competenceName(getString, activeEval.dimension_key, activeEval.dimension_name)}
                                            </Typography>
                                            {competenceHint(getString, activeEval.dimension_key, activeEval.dimension_description ?? '') && (
                                                <Tooltip
                                                    title={competenceHint(getString, activeEval.dimension_key, activeEval.dimension_description ?? '')}
                                                    placement="right"
                                                    arrow
                                                    componentsProps={{ tooltip: { sx: { maxWidth: 360, whiteSpace: 'pre-line' } } }}
                                                >
                                                    <InfoOutlinedIcon sx={{ fontSize: 17, color: t.textMuted, cursor: 'help' }} />
                                                </Tooltip>
                                            )}
                                        </Stack>

                                        {/* Rating */}
                                        <Box sx={{ mb: 3 }}>
                                            <Typography fontSize={13} fontWeight={600} color={t.textSecondary} mb={0.75}>Score (0–5)</Typography>
                                            <Stack direction="row" alignItems="center" spacing={1.5}>
                                                <Rating
                                                    value={activeEval.score ?? 0}
                                                    max={5}
                                                    onChange={(_, v) => { if (isEditable) updateLocal(activeEval.id, 'score', v); }}
                                                    readOnly={!isEditable}
                                                    size="large"
                                                    sx={{ '& .MuiRating-iconFilled': { color: activeColor }, '& .MuiRating-iconHover': { color: activeColor } }}
                                                />
                                                <Typography fontWeight={700} color={activeColor} fontSize={15}>
                                                    {activeEval.score !== null ? `${activeEval.score}/5` : '—'}
                                                </Typography>
                                            </Stack>
                                        </Box>

                                        <Box sx={{ mb: 2 }}>
                                            <Typography fontSize={13} fontWeight={600} color={t.textSecondary} mb={1}>
                                                {getString('factsAndAchievements')}
                                            </Typography>
                                            {activeEval.facts.length > 0 && (
                                                <Box sx={{ mb: 1.5 }}>
                                                    {activeEval.facts.map((fact, idx) => (
                                                        <Stack
                                                            key={`fact-${idx}`}
                                                            direction="row"
                                                            alignItems="flex-start"
                                                            spacing={0.5}
                                                            sx={{
                                                                mb: 0.5,
                                                                py: 0.5,
                                                                px: 0.75,
                                                                borderRadius: '6px',
                                                                '&:hover': { bgcolor: activeColor + '10' },
                                                            }}
                                                        >
                                                            <Typography
                                                                fontSize={12}
                                                                fontWeight={700}
                                                                color={activeColor}
                                                                sx={{ minWidth: 22, pt: '2px' }}
                                                            >
                                                                {idx + 1}.
                                                            </Typography>
                                                            <Typography fontSize={13} sx={{ flex: 1, pt: '2px', wordBreak: 'break-word' }}>
                                                                {fact}
                                                            </Typography>
                                                            {isEditable && isCompetencePicked(activeEval.dimension_key) && (
                                                                <Tooltip title={getString('copyToSummaryComment')}>
                                                                    <IconButton
                                                                        size="small"
                                                                        onClick={() => copyFactToSummary(activeEval.dimension_key, fact)}
                                                                        sx={{ p: 0.25, mt: '-2px' }}
                                                                    >
                                                                        <ContentCopyIcon sx={{ fontSize: 13 }} />
                                                                    </IconButton>
                                                                </Tooltip>
                                                            )}
                                                            {isEditable && (
                                                                <Tooltip title={getString('deleteFact')}>
                                                                    <IconButton
                                                                        size="small"
                                                                        onClick={() => removeFact(activeEval.id, idx)}
                                                                        sx={{ p: 0.25, mt: '-2px' }}
                                                                    >
                                                                        <CloseIcon sx={{ fontSize: 14 }} />
                                                                    </IconButton>
                                                                </Tooltip>
                                                            )}
                                                        </Stack>
                                                    ))}
                                                </Box>
                                            )}
                                            {isEditable && (
                                                <Stack direction="row" spacing={1}>
                                                    <TextField
                                                        size="small"
                                                        placeholder={getString('typeFactPlaceholder')}
                                                        value={newFactTexts[activeEval.id] ?? ''}
                                                        onChange={e =>
                                                            setNewFactTexts(prev => ({ ...prev, [activeEval.id]: e.target.value }))
                                                        }
                                                        onKeyDown={e => {
                                                            if (e.key === 'Enter' && !e.shiftKey) {
                                                                e.preventDefault();
                                                                addFact(activeEval.id, newFactTexts[activeEval.id] ?? '');
                                                            }
                                                        }}
                                                        fullWidth
                                                    />
                                                    <Button
                                                        variant="outlined"
                                                        size="small"
                                                        startIcon={<AddIcon />}
                                                        onClick={() => addFact(activeEval.id, newFactTexts[activeEval.id] ?? '')}
                                                        disabled={!(newFactTexts[activeEval.id] ?? '').trim()}
                                                        sx={{ textTransform: 'none', whiteSpace: 'nowrap' }}
                                                    >
                                                        {getString('addFact')}
                                                    </Button>
                                                </Stack>
                                            )}
                                        </Box>
                                        <TextField
                                            label={getString('areasForImprovement')}
                                            value={activeEval.improvement}
                                            onChange={e => updateLocal(activeEval.id, 'improvement', e.target.value)}
                                            fullWidth multiline rows={2}
                                            disabled={!isEditable}
                                        />

                                        {/* Prev / Next tab */}
                                        <Stack direction="row" justifyContent="space-between" mt={2.5}>
                                            <Button size="small" disabled={activeTab === 0}
                                                onClick={() => setActiveTab(p => p - 1)}
                                                sx={{ textTransform: 'none', color: t.textMuted }}>
                                                ← Previous dimension
                                            </Button>
                                            <Button size="small" disabled={activeTab === visibleEvals.length - 1}
                                                onClick={() => setActiveTab(p => p + 1)}
                                                sx={{ textTransform: 'none', color: activeColor }}>
                                                Next dimension →
                                            </Button>
                                        </Stack>
                                    </Box>
                                )}
                            </Box>
                        )}
                    </>
                )}
            </Box>

            <Snackbar open={snackbar.open} autoHideDuration={5000}
                onClose={() => setSnackbar(p => ({ ...p, open: false }))}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
                <Alert severity={snackbar.severity} onClose={() => setSnackbar(p => ({ ...p, open: false }))} sx={{ width: '100%' }}>
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </AppShell>
    );
}

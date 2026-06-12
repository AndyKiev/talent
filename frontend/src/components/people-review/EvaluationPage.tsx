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
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    FormControl,
    IconButton,
    InputLabel,
    MenuItem,
    Select,
    Snackbar,
    Stack,
    Switch,
    Tab,
    Tabs,
    Tooltip,
    Typography,
} from '@mui/material';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import SaveIcon from '@mui/icons-material/Save';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import LockIcon from '@mui/icons-material/Lock';
import ReplayIcon from '@mui/icons-material/Replay';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import VisibilityIcon from '@mui/icons-material/Visibility';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import dayjs from 'dayjs';
import { Link } from '@tanstack/react-router';
import EmployeeDateDialog from './personal-data/EmployeeDateDialog';
import EducationBlock from './education/EducationBlock';
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
    fetchReviewLevels,
    fetchEmployeeCurrentLevel,
    setEmployeeCurrentLevel,
    fetchEmployeePersonalData,
    type EvaluationBulkUpdate,
    type CriterionScore,
    type EmployeeLanguageInput,
    type RSEFieldsUpdate,
} from './peopleReviewApi';
import { ProposedLevelDrawer } from './ProposedLevelDrawer';
import useString from '../../hooks/useString';
import { str } from '../../strings/str';
import { useAuthStore } from '../../store/authStore';
import { defaultLangShortName } from '../../utils/eNums';
import { useTheme } from '../theme/ThemeContext';
import {
    type LocalEval,
    type SummaryOption,
    type DraggedFact,
    type PendingMove,
    RSE_STATUS_COLORS,
    FOREIGN_LANGUAGES,
    getDimColor,
    competenceName,
    evalFilled,
    serializeFacts,
    formatYearsMonths,
    rankedCompetences,
} from './evaluation/evaluationHelpers';
import {
    usePeopleReviewStore,
    buildEvaluationDraft,
    EMPTY_EVAL_DRAFT,
    type EvaluationDraft,
} from './peopleReviewStore';
import { DimensionChart } from './evaluation/DimensionChart';
import { CompetenceSummarySection } from './evaluation/CompetenceSummarySection';
import { EmployeeFactsBar } from './evaluation/EmployeeFactsBar';
import { EmployeeDataTabs } from './evaluation/EmployeeDataTabs';
import { DimensionPanel } from './evaluation/DimensionPanel';

export function EvaluationPage() {
    const { rseId } = useParams({ strict: false }) as { rseId: string };
    const navigate = useNavigate();
    const qc = useQueryClient();
    const rid = Number(rseId);
    const { t } = useTheme();
    const getString = useString({ str });

    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
    const [activeTab, setActiveTab] = useState(0);
    // Presentation mode: hide every editing affordance for a clean read-only view
    // even while the record is technically editable (job done, just presenting).
    const [presentationMode, setPresentationMode] = useState(false);
    // Drag-and-drop of a fact from the active competence onto another tab.
    const [draggedFact, setDraggedFact] = useState<DraggedFact | null>(null);
    const [dragOverTab, setDragOverTab] = useState<number | null>(null);
    const [dragOverFactIndex, setDragOverFactIndex] = useState<number | null>(null);
    const [pendingMove, setPendingMove] = useState<PendingMove | null>(null);
    const [newFactTexts, setNewFactTexts] = useState<Record<number, string>>({});

    const { data: rseDetail, isLoading: rseLoading, isFetching: rseFetching } = useQuery({
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

    const { data: evaluations = [], isLoading: evalLoading, isFetching: evalFetching } = useQuery({
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
    const { data: langProfile, isFetching: langFetching } = useQuery({
        queryKey: ['employee_language_profile', employeeId],
        queryFn: () => fetchEmployeeLanguageProfile(employeeId!),
        staleTime: 30_000,
        enabled: !!employeeId,
    });

    // --- Editable draft (zustand) ---------------------------------------------
    // All unsaved edits live in the per-rseId draft so navigating between
    // employees / pages doesn't lose them. `storeDraft` is undefined until the
    // draft is hydrated; `draft` falls back to a stable frozen sentinel for reads.
    const storeDraft = usePeopleReviewStore((s) => s.evalDrafts[rid]);
    const hydrateEvalDraft = usePeopleReviewStore((s) => s.hydrateEvalDraft);
    const updateEvalDraft = usePeopleReviewStore((s) => s.updateEvalDraft);
    const clearEvalDraft = usePeopleReviewStore((s) => s.clearEvalDraft);
    const draft = storeDraft ?? EMPTY_EVAL_DRAFT;
    const {
        localEvals, langSel, employeeFeedback, managerFeedback,
        results, missions, trainings,
        strongOptions, developOptions, strongDrafts, developDrafts,
    } = draft;

    // Field setters with the React `useState` dispatch signature so the existing
    // handlers below can keep using `setX(prev => ...)` unchanged — each writes
    // back into the store draft for the current rseId.
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
    const setMissions = makeSetter('missions');
    const setTrainings = makeSetter('trainings');
    const setStrongOptions = makeSetter('strongOptions');
    const setDevelopOptions = makeSetter('developOptions');
    const setStrongDrafts = makeSetter('strongDrafts');
    const setDevelopDrafts = makeSetter('developDrafts');

    const langMut = useMutation({
        mutationFn: (languages: EmployeeLanguageInput[]) =>
            saveEmployeeLanguageProfile(employeeId!, languages),
        onSuccess: async () => {
            await qc.invalidateQueries({ queryKey: ['employee_language_profile', employeeId] });
        },
        onError: (err: Error) => setSnackbar({ open: true, message: err.message, severity: 'error' }),
    });

    // --- Competency level (current + proposed) ---
    const [proposedOpen, setProposedOpen] = useState(false);
    const { data: allLevels = [] } = useQuery({
        queryKey: ['review_levels', 'active'],
        queryFn: () => fetchReviewLevels(true),
        staleTime: 5 * 60_000,
    });
    const { data: empLevel } = useQuery({
        queryKey: ['employee_current_level', employeeId],
        queryFn: () => fetchEmployeeCurrentLevel(employeeId!),
        enabled: !!employeeId,
        staleTime: 30_000,
    });
    const currentLevelMut = useMutation({
        mutationFn: (levelId: number) => setEmployeeCurrentLevel(employeeId!, levelId),
        onSuccess: async () => {
            await qc.invalidateQueries({ queryKey: ['employee_current_level', employeeId] });
        },
        onError: (err: Error) => setSnackbar({ open: true, message: err.message, severity: 'error' }),
    });

    // --- Personal data (birth date / age, hire date / tenure, job-assigned date) ---
    const [birthDateOpen, setBirthDateOpen] = useState(false);
    const [hireDateOpen, setHireDateOpen] = useState(false);
    const [jobAssignedOpen, setJobAssignedOpen] = useState(false);
    const { data: personalData } = useQuery({
        queryKey: ['employee_personal_data', employeeId],
        queryFn: () => fetchEmployeePersonalData(employeeId!),
        enabled: !!employeeId,
        staleTime: 30_000,
    });
    const employeeAge = personalData?.birth_date
        ? dayjs().diff(dayjs(personalData.birth_date), 'year')
        : null;
    const employeeTenure = personalData?.hire_date
        ? dayjs().diff(dayjs(personalData.hire_date), 'year')
        : null;
    const userLang = useAuthStore((s) => s.user?.lang?.short_name) || defaultLangShortName;
    // Full "X years Y months" time on the current job, shown next to the job name.
    const positionDuration = personalData?.job_assigned_date
        ? formatYearsMonths(personalData.job_assigned_date, getString, userLang)
        : null;

    // --- Ephemeral tab / input UI (not part of the saved draft) ---
    const [dataTab, setDataTab] = useState(0);
    const [newResultText, setNewResultText] = useState('');
    const [analysisTab, setAnalysisTab] = useState(0);

    // Hydrate the draft once all server data for this rseId is loaded and settled.
    // Skipped when a draft already exists, so in-progress edits survive navigating
    // away and back; the draft is cleared on save, which lets this repopulate it
    // from the fresh server response.
    const hydrationReady =
        !!rseDetail && !rseFetching && !evalFetching &&
        (!employeeId || (langProfile !== undefined && !langFetching));
    useEffect(() => {
        if (!hydrationReady || !rseDetail || storeDraft) return;
        hydrateEvalDraft(rid, buildEvaluationDraft(rseDetail, evaluations, langProfile, getString));
    }, [hydrationReady, storeDraft, rid, rseDetail, evaluations, langProfile, getString, hydrateEvalDraft]);

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
        navigate({ to: '/people-review/evaluation/$rseId', params: { rseId: String(id) } });
    };

    const isLoading = rseLoading || evalLoading;
    const sessionStatus = rseDetail?.session_status ?? 'open';
    // Editable only if BOTH session is open AND employee status is open
    const isEditable = rseDetail?.status === 'open' && sessionStatus === 'open';
    // Editing affordances inside the content are additionally gated by presentation
    // mode; header actions (Save / Mark reviewed / Revert) stay on real `isEditable`.
    const showEditing = isEditable && !presentationMode;
    const isSessionClosed = sessionStatus === 'closed';

    // In a closed session show every dimension; otherwise only active ones.
    const visibleEvals = isSessionClosed ? localEvals : localEvals.filter(e => e.dimension_is_active);

    const allFilled = visibleEvals.length > 0 && visibleEvals.every(evalFilled);
    const filledCount = visibleEvals.filter(evalFilled).length;
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

    // Jump the facts section below to the tab of the given competence
    // (used when a competence is selected in the summary above).
    const activateCompetenceTab = (key: string) => {
        const idx = visibleEvals.findIndex(e => e.dimension_key === key);
        if (idx >= 0) setActiveTab(idx);
    };

    const handleSave = async () => {
        const updates: EvaluationBulkUpdate[] = localEvals.map(le => {
            // Send the per-behaviour scores; the backend derives the competence
            // level (fractional mean + legacy rounded score) from them.
            const criterion_scores: CriterionScore[] = [];
            le.descriptors.forEach((_, i) => {
                const s = le.criterionScores[i];
                if (s != null) criterion_scores.push({ criterion_index: i, score: s });
            });
            return {
                id: le.id,
                facts: serializeFacts(le.facts) || null,
                improvement: le.improvement || null,
                criterion_scores,
            };
        });
        const hasMissions = missions.some(m => m.trim());
        const hasSummary = strongOptions.length > 0 || developOptions.length > 0;
        const tasks: Promise<unknown>[] = [
            saveMut.mutateAsync(updates),
            rseFieldsMut.mutateAsync({
                employee_feedback: employeeFeedback || null,
                manager_feedback: managerFeedback || null,
                results_achievements: serializeFacts(results) || null,
                development_plan: hasMissions ? JSON.stringify(missions) : null,
                trainings: trainings || null,
                competence_summary: hasSummary
                    ? JSON.stringify({ strong: strongOptions, develop: developOptions })
                    : null,
            }),
        ];
        if (employeeId) {
            const languages: EmployeeLanguageInput[] = FOREIGN_LANGUAGES.map(({ key }) => ({
                language: key,
                level_id: langSel[key] ?? null,
            }));
            tasks.push(langMut.mutateAsync(languages));
        }
        try {
            // Each mutation awaits its own query invalidation (refetch) in onSuccess,
            // so once all settle the server data is fresh — drop the draft to let the
            // hydration effect repopulate it (keeps backend-derived fields current).
            await Promise.all(tasks);
            clearEvalDraft(rid);
        } catch {
            // Per-mutation onError already surfaced the failure to the user.
        }
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

    // Reorder a fact within the same competence (drop it *before* the target row).
    const reorderFact = (evalId: number, from: number, toRow: number) => {
        const to = from < toRow ? toRow - 1 : toRow;
        if (from === to) return;
        setLocalEvals(prev => prev.map(e => {
            if (e.id !== evalId) return e;
            const next = [...e.facts];
            const [moved] = next.splice(from, 1);
            next.splice(to, 0, moved);
            return { ...e, facts: next };
        }));
    };

    // Move a numbered fact from one competence to another. Both lists re-number
    // automatically (numbering is the render-time array index).
    const moveFact = (fromEvalId: number, index: number, toEvalId: number) => {
        if (fromEvalId === toEvalId) return;
        setLocalEvals(prev => {
            const fact = prev.find(e => e.id === fromEvalId)?.facts[index];
            if (fact == null) return prev;
            return prev.map(e => {
                if (e.id === fromEvalId) return { ...e, facts: e.facts.filter((_, i) => i !== index) };
                if (e.id === toEvalId) return { ...e, facts: [...e.facts, fact] };
                return e;
            });
        });
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
                        <Typography variant="body2" color="text.secondary">{getString('peopleReview')}</Typography>
                    </Link>
                    {rseDetail && (
                        <Link
                            to="/people-review/$sessionId"
                            params={{ sessionId: String(rseDetail.session_id) }}
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

                                {/* Current level selector */}
                                <FormControl size="small" sx={{ minWidth: 150 }}>
                                    <InputLabel>{getString('currentLevel')}</InputLabel>
                                    <Select
                                        variant="outlined"
                                        label={getString('currentLevel')}
                                        value={empLevel?.current_level_id ? String(empLevel.current_level_id) : ''}
                                        onChange={(e) => currentLevelMut.mutate(Number(e.target.value))}
                                        disabled={!employeeId || currentLevelMut.isPending}
                                    >
                                        {allLevels
                                            .slice()
                                            .sort((a, b) => a.sort_order - b.sort_order)
                                            .map((lvl) => (
                                                <MenuItem key={lvl.id} value={String(lvl.id)}>
                                                    {getString(lvl.name_key)}
                                                </MenuItem>
                                            ))}
                                    </Select>
                                </FormControl>

                                {/* Proposed level (drawer) */}
                                <Button
                                    size="small"
                                    variant="outlined"
                                    startIcon={<TrendingUpIcon />}
                                    onClick={() => setProposedOpen(true)}
                                    sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 600, fontSize: 12 }}
                                >
                                    {getString('proposedLevel')}
                                </Button>

                                {/* Mark reviewed */}
                                {isEditable && (
                                    <Tooltip
                                        title={allFilled ? getString('markAsReviewed') : getString('fillAllDimensions', { filled: filledCount, total: totalCount })}
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
                                                {getString('markReviewed')}
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
                                        {saveMut.isPending ? getString('saving') : getString('save')}
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

                                {/* Presentation mode toggle — hides every editing affordance.
                                    Only meaningful while editable (open status); reviewed/closed
                                    are already read-only, so the switch is not rendered there. */}
                                {isEditable && (
                                    <Tooltip title={getString('presentationModeHint')} placement="top">
                                        <Stack direction="row" alignItems="center" spacing={0.25} sx={{ ml: 0.5 }}>
                                            <Switch
                                                size="small"
                                                checked={presentationMode}
                                                onChange={(e) => setPresentationMode(e.target.checked)}
                                            />
                                            <Typography fontSize={12} fontWeight={600} color={t.textMuted} sx={{ whiteSpace: 'nowrap' }}>
                                                {getString('presentationMode')}
                                            </Typography>
                                        </Stack>
                                    </Tooltip>
                                )}
                            </Stack>
                        </Box>

                        {/* Employee facts — spread evenly across the full width */}
                        <EmployeeFactsBar
                            jobName={personalData?.job_name}
                            departmentName={personalData?.main_department_name}
                            birthDate={personalData?.birth_date}
                            hireDate={personalData?.hire_date}
                            jobAssignedDate={personalData?.job_assigned_date}
                            employeeAge={employeeAge}
                            employeeTenure={employeeTenure}
                            positionDuration={positionDuration}
                            showEdit={!!employeeId}
                            getString={getString}
                            onEditBirth={() => setBirthDateOpen(true)}
                            onEditHire={() => setHireDateOpen(true)}
                            onEditJobAssigned={() => setJobAssignedOpen(true)}
                        />

                        {/* Education block (1:N) — full width */}
                        {employeeId && (
                            <Box sx={{ mb: 2.5 }}>
                                <EducationBlock
                                    employeeId={employeeId}
                                    getString={getString}
                                    onSuccess={(message) => setSnackbar({ open: true, message, severity: 'success' })}
                                    onError={(message) => setSnackbar({ open: true, message, severity: 'error' })}
                                />
                            </Box>
                        )}

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
                        <EmployeeDataTabs
                            dataTab={dataTab}
                            onDataTabChange={setDataTab}
                            isEditable={showEditing}
                            getString={getString}
                            langLevels={langLevels}
                            langSel={langSel}
                            setLangSel={setLangSel}
                            employeeFeedback={employeeFeedback}
                            onEmployeeFeedbackChange={setEmployeeFeedback}
                            managerFeedback={managerFeedback}
                            onManagerFeedbackChange={setManagerFeedback}
                            results={results}
                            newResultText={newResultText}
                            onNewResultTextChange={setNewResultText}
                            onAddResult={addResult}
                            onRemoveResult={removeResult}
                            missions={missions}
                            onUpdateMission={updateMission}
                            trainings={trainings}
                            onTrainingsChange={setTrainings}
                        />

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
                                                    isEditable={showEditing}
                                                    getString={getString}
                                                    drafts={strongDrafts}
                                                    onDraftChange={(key, value) => setStrongDrafts(prev => ({ ...prev, [key]: value }))}
                                                    onAddOption={key => addSummaryOption(setStrongOptions, key)}
                                                    onRemoveOption={key => removeSummaryOption(setStrongOptions, key)}
                                                    onAddComment={(key, text) => addSummaryComment(setStrongOptions, key, text)}
                                                    onRemoveComment={(key, idx) => removeSummaryComment(setStrongOptions, key, idx)}
                                                    onSelectCompetence={activateCompetenceTab}
                                                />
                                                <CompetenceSummarySection
                                                    title={getString('competencesToDevelop')}
                                                    accent="#E02424"
                                                    options={developOptions}
                                                    candidates={developCandidates}
                                                    nameOf={competenceLabel}
                                                    colorOf={competenceColor}
                                                    isEditable={showEditing}
                                                    getString={getString}
                                                    drafts={developDrafts}
                                                    onDraftChange={(key, value) => setDevelopDrafts(prev => ({ ...prev, [key]: value }))}
                                                    onAddOption={key => addSummaryOption(setDevelopOptions, key)}
                                                    onRemoveOption={key => removeSummaryOption(setDevelopOptions, key)}
                                                    onAddComment={(key, text) => addSummaryComment(setDevelopOptions, key, text)}
                                                    onRemoveComment={(key, idx) => removeSummaryComment(setDevelopOptions, key, idx)}
                                                    onSelectCompetence={activateCompetenceTab}
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
                            <DimensionPanel
                                visibleEvals={visibleEvals}
                                localEvals={localEvals}
                                activeTab={activeTab}
                                setActiveTab={setActiveTab}
                                isEditable={showEditing}
                                getString={getString}
                                draggedFact={draggedFact}
                                setDraggedFact={setDraggedFact}
                                dragOverTab={dragOverTab}
                                setDragOverTab={setDragOverTab}
                                dragOverFactIndex={dragOverFactIndex}
                                setDragOverFactIndex={setDragOverFactIndex}
                                setPendingMove={setPendingMove}
                                newFactTexts={newFactTexts}
                                setNewFactTexts={setNewFactTexts}
                                setCriterion={setCriterion}
                                addFact={addFact}
                                removeFact={removeFact}
                                reorderFact={reorderFact}
                                updateLocal={updateLocal}
                                isCompetencePicked={isCompetencePicked}
                                copyFactToSummary={copyFactToSummary}
                            />
                        )}
                    </>
                )}
            </Box>

            <ProposedLevelDrawer
                open={proposedOpen}
                onClose={() => setProposedOpen(false)}
                rseId={rid}
                setSnackbar={setSnackbar}
            />

            {employeeId && (
                <>
                    <EmployeeDateDialog
                        open={birthDateOpen}
                        onClose={() => setBirthDateOpen(false)}
                        employeeId={employeeId}
                        field="birth_date"
                        value={personalData?.birth_date ?? null}
                        titleKey="editBirthDate"
                        labelKey="birthDate"
                        getString={getString}
                        onError={(message) => setSnackbar({ open: true, message, severity: 'error' })}
                    />
                    <EmployeeDateDialog
                        open={hireDateOpen}
                        onClose={() => setHireDateOpen(false)}
                        employeeId={employeeId}
                        field="hire_date"
                        value={personalData?.hire_date ?? null}
                        titleKey="editHireDate"
                        labelKey="hireDate"
                        getString={getString}
                        onError={(message) => setSnackbar({ open: true, message, severity: 'error' })}
                    />
                    <EmployeeDateDialog
                        open={jobAssignedOpen}
                        onClose={() => setJobAssignedOpen(false)}
                        employeeId={employeeId}
                        field="job_assigned_date"
                        value={personalData?.job_assigned_date ?? null}
                        titleKey="editJobAssignedDate"
                        labelKey="jobAssignedDate"
                        getString={getString}
                        onError={(message) => setSnackbar({ open: true, message, severity: 'error' })}
                    />
                </>
            )}

            <Snackbar open={snackbar.open} autoHideDuration={5000}
                onClose={() => setSnackbar(p => ({ ...p, open: false }))}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
                <Alert severity={snackbar.severity} onClose={() => setSnackbar(p => ({ ...p, open: false }))} sx={{ width: '100%' }}>
                    {snackbar.message}
                </Alert>
            </Snackbar>

            {/* Confirm moving a fact to another competence tab */}
            <Dialog open={pendingMove != null} onClose={() => setPendingMove(null)} maxWidth="xs" fullWidth>
                <DialogTitle>{getString('moveFactTitle')}</DialogTitle>
                <DialogContent>
                    <DialogContentText sx={{ mb: 1 }}>
                        {getString('moveFactConfirm', { target: pendingMove?.toName ?? '' })}
                    </DialogContentText>
                    {pendingMove && (
                        <Typography fontSize={13} sx={{ fontStyle: 'italic', color: t.textMuted, wordBreak: 'break-word' }}>
                            “{pendingMove.fact}”
                        </Typography>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setPendingMove(null)} sx={{ textTransform: 'none' }}>
                        {getString('cancel')}
                    </Button>
                    <Button
                        variant="contained"
                        onClick={() => {
                            if (pendingMove) {
                                moveFact(pendingMove.fromEvalId, pendingMove.index, pendingMove.toEvalId);
                                setActiveTab(pendingMove.toTabIndex);
                            }
                            setPendingMove(null);
                        }}
                        sx={{ textTransform: 'none' }}
                    >
                        {getString('move')}
                    </Button>
                </DialogActions>
            </Dialog>
        </AppShell>
    );
}

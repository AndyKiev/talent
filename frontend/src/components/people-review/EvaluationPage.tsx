import { useState, useEffect, useRef, type Dispatch, type SetStateAction } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from '@tanstack/react-router';
import {
    Alert,
    Badge,
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
    FormControlLabel,
    IconButton,
    Snackbar,
    Stack,
    Switch,
    Tab,
    Tabs,
    Tooltip,
    Typography,
} from '@mui/material';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import LockIcon from '@mui/icons-material/Lock';
import ReplayIcon from '@mui/icons-material/Replay';
import RefreshIcon from '@mui/icons-material/Refresh';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import VisibilityIcon from '@mui/icons-material/Visibility';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import ArticleOutlinedIcon from '@mui/icons-material/ArticleOutlined';
import CloseIcon from '@mui/icons-material/Close';
import dayjs from 'dayjs';
import { Link } from '@tanstack/react-router';
import EmployeeDateDialog from './personal-data/EmployeeDateDialog';
import AppShell from '../layout/AppShell.tsx';
import {
    fetchRSEBySessionEmployee,
    fetchMyScopes,
    fetchSessionEmployees,
    fetchEvaluations,
    markReviewed,
    revertRSE,
    reopenRSE,
    fetchLanguageLevels,
    fetchEmployeeLanguageProfile,
    fetchReviewLevels,
    fetchSessionLevels,
    fetchProposedLevel,
    setEmployeeCurrentLevel,
    fetchReviewComments,
    fetchTempoPngUrl,
    downloadTempoPdf,
    openTempoHtml,
    flipCompetence,
} from './peopleReviewApi';
import { ProposedLevelDrawer } from './ProposedLevelDrawer';
import { ReviewCommentsDrawer } from './ReviewCommentsDrawer';
import useString from '../../hooks/useString';
import { str } from '../../strings/str';
import { useAuthStore } from '../../store/authStore';
import { defaultLangShortName } from '../../utils/eNums';
import { PEOPLE_REVIEW_MY_SCOPES_QK } from '../../utils/queryKeys';
import { useTheme } from '../theme/ThemeContext';
import {
    type SummaryOption,
    type SummarySide,
    type DraggedItem,
    type PendingMove,
    type PendingFlip,
    RSE_STATUS_COLORS,
    getDimColor,
    pickSummaryAccent,
    competenceName,
    evalFilled,
    formatYearsMonths,
    rankedCompetences,
    detectCompetenceFlip,
} from './evaluation/evaluationHelpers';
import {
    usePeopleReviewStore,
    buildEvaluationDraft,
    EMPTY_EVAL_DRAFT,
    type EvaluationDraft,
} from './peopleReviewStore';
import { DimensionChart } from './evaluation/DimensionChart';
import { CompetenceSummarySection } from './evaluation/CompetenceSummarySection';
import { PersonalInfoPanel } from './evaluation/PersonalInfoPanel';
import { JobInfoPanel } from './evaluation/JobInfoPanel';
import { TalentStatusPeriodPanel } from './evaluation/TalentStatusPeriodPanel';
import { useBooleanSetting, useIntegerSetting } from '../../hooks/useAppSetting';
import { useFrozenBooleanSetting } from './useFrozenSetting';
import { EmployeeDataTabs } from './evaluation/EmployeeDataTabs';
import { DevelopmentPlanSection } from './evaluation/DevelopmentPlanSection';
import { DimensionPanel } from './evaluation/DimensionPanel';
import { useEvaluationAutosave } from './evaluation/useEvaluationAutosave';
import EmployeeAvatar from '../ui/EmployeeAvatar';
import BusyBackdrop from '../ui/BusyBackdrop';
import { OversightManagerPicker } from './OversightManagerPicker';
import { useOnlyMeMode } from './useOnlyMeMode';

export function EvaluationPage() {
    const { sessionId: sessionIdParam, employeeId: employeeIdParam } = useParams({ strict: false }) as { sessionId: string; employeeId: string };
    const navigate = useNavigate();
    const qc = useQueryClient();
    const sid = Number(sessionIdParam);
    const eid = Number(employeeIdParam);
    const { t } = useTheme();
    const getString = useString({ str });
    const myEmployeeId = useAuthStore((s) => s.user?.id) ?? null;
    // 'Only me' users must not navigate back to the session via breadcrumbs.
    const onlyMeMode = useOnlyMeMode();
    // Developer setting: when on, the talent status/period can be edited from
    // inside people-review (otherwise it's read-only here). Display is unaffected.
    // Read from the SESSION-FROZEN snapshot, not the live setting — a settings
    // change after open must not re-gate this session.
    const { enabled: canEditTalentStatus } = useFrozenBooleanSetting(sid, 'people_review_edit_talent_status');
    // Developer settings for the individual development plan: how many missions
    // must / may be saved, and whether the user may link a mission to ANY
    // competence (vs. only the competences picked in the "to develop" summary).
    const { value: minMissions } = useIntegerSetting('idp_min_missions', 1);
    const { value: maxMissions } = useIntegerSetting('idp_max_missions', 5);
    const { enabled: allowFullCompetenceList } = useBooleanSetting('idp_allow_full_competence_list');
    // When ON, each review may switch its two competence-summary selects to the
    // full competence list (gates the per-review switch's visibility below).
    // Session-frozen, same as canEditTalentStatus above.
    const { enabled: allowSummaryFullList } = useFrozenBooleanSetting(sid, 'people_review_summary_full_competence_list');
    // When ON, an employee with no current level gets the base level persisted to
    // their record; when OFF the base level is only shown (no DB write).
    const { enabled: persistDefaultLevel } = useBooleanSetting('employee_default_level_persist');

    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
    const [activeTab, setActiveTab] = useState(0);
    // Presentation mode: hide every editing affordance for a clean read-only view
    // even while the record is technically editable (job done, just presenting).
    const [presentationMode, setPresentationMode] = useState(false);
    // Drag-and-drop of a fact from the active competence onto another tab.
    const [draggedItem, setDraggedItem] = useState<DraggedItem | null>(null);
    const [dragOverTab, setDragOverTab] = useState<number | null>(null);
    const [dragOverFactIndex, setDragOverFactIndex] = useState<number | null>(null);
    const [pendingMove, setPendingMove] = useState<PendingMove | null>(null);
    // A star re-rating held back because it would flip a competence to the
    // opposite summary list — confirmed via a dialog, then applied atomically.
    const [pendingFlip, setPendingFlip] = useState<PendingFlip | null>(null);
    // A direct removal of a to-develop competence that is linked to a mission —
    // held back for confirmation because it unlinks that mission (allow-full off).
    const [pendingDevelopRemoval, setPendingDevelopRemoval] = useState<{ key: string; name: string } | null>(null);
    // Turning the full-list switch OFF re-arms ranked selection, so any picked
    // competence that no longer fits its side is re-evaluated. The ones that must
    // leave are held here for a single confirmation (may span both sides).
    const [pendingSummaryReconcile, setPendingSummaryReconcile] =
        useState<{ key: string; name: string; side: SummarySide }[] | null>(null);
    const [newFactTexts, setNewFactTexts] = useState<Record<number, string>>({});
    const [newImprovementTexts, setNewImprovementTexts] = useState<Record<number, string>>({});

    // Active people-review mode — resolved first so the per-person queries below
    // can gate their polling on it. Supervision (department-target role) = read-only
    // "watch": until my_scopes loads, default to view-only so a supervisor never
    // sees an editable flash, and so editors don't poll before their role is known.
    const { data: scopes } = useQuery({
        queryKey: PEOPLE_REVIEW_MY_SCOPES_QK,
        queryFn: fetchMyScopes,
        staleTime: 60_000,
    });
    const activeRoleId = scopes?.active.process_role_id ?? null;
    const activeRole = scopes?.roles.find((r) => r.process_role_id === activeRoleId) ?? null;
    const isSupervision = activeRole?.link_target === 'department';
    const viewOnly = isSupervision || !scopes;
    // No auto-polling. The per-person data is refetched on navigation, on mutation
    // (each save invalidates the relevant key), and on tab refocus. Supervisors
    // (read-only) get an explicit refresh button in the header to pull fresh data
    // on demand — see `refreshPersonData` below. Editors never refetch in the
    // background so their in-memory draft is never clobbered.

    const { data: rseDetail, isLoading: rseLoading, isFetching: rseFetching } = useQuery({
        queryKey: ['rse_detail', sid, eid],
        queryFn: () => fetchRSEBySessionEmployee(sid, eid),
        staleTime: 30_000,
        enabled: !!sid && !!eid,
    });
    // Flat rse id, resolved from (session, employee). Everything below keys off it
    // exactly as before; 0 until the detail loads, so dependent queries stay gated.
    const rid = rseDetail?.id ?? 0;

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
    const draft = storeDraft ?? EMPTY_EVAL_DRAFT;
    const {
        localEvals, langSel, employeeFeedback, managerFeedback,
        results, missions, trainings,
        strongOptions, developOptions, strongDrafts, developDrafts,
        summaryFullCompetenceList,
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
    const setSummaryFullCompetenceList = makeSetter('summaryFullCompetenceList');

    // --- TEMPO album (viewer dialog) ---
    // Lazily fetch the album as a PNG blob URL (axios sends the JWT; a plain src
    // can't) and show it inline in an <img> — browsers always render images,
    // whereas an application/pdf iframe is downloaded in many of them. The PDF is
    // offered as an explicit download. The URL is revoked on close.
    const [pdfOpen, setPdfOpen] = useState(false);
    const [pdfUrl, setPdfUrl] = useState<string | null>(null);
    const [pdfLoading, setPdfLoading] = useState(false);
    const [pdfError, setPdfError] = useState<string | null>(null);
    // Full-window blocking overlay label for the long PDF/HTML builds (null = idle).
    const [busyLabel, setBusyLabel] = useState<string | null>(null);
    const openTempoPdf = async () => {
        setPdfOpen(true);
        setPdfLoading(true);
        setPdfError(null);
        try {
            const url = await fetchTempoPngUrl(rid);
            setPdfUrl(url);
        } catch (err) {
            // Keep the dialog open and show the reason in-place — a silent close
            // looked like "nothing displayed".
            setPdfError((err as Error).message || getString('tempoPdfError'));
        } finally {
            setPdfLoading(false);
        }
    };
    const closeTempoPdf = () => {
        setPdfOpen(false);
        setPdfError(null);
        if (pdfUrl) { URL.revokeObjectURL(pdfUrl); setPdfUrl(null); }
    };
    const downloadTempo = async () => {
        // Filename = session id + session name + employee code + employee name
        // (sanitized of path/illegal chars), per request — not a hash.
        const sanitize = (s: string) => s.replace(/[/\\:*?"<>|]+/g, '').replace(/\s+/g, '_').trim();
        const parts = [
            rseDetail?.session_id != null ? `s${rseDetail.session_id}` : null,
            rseDetail?.session_name,
            rseDetail?.employee_code,
            rseDetail?.employee_name,
        ].filter(Boolean).map((p) => sanitize(String(p)));
        const fileName = `${parts.join('_') || `tempo_${rid}`}.pdf`;
        setBusyLabel(getString('tempoPdfBuilding'));
        try {
            await downloadTempoPdf(rid, fileName);
        } catch (err) {
            setSnackbar({ open: true, message: (err as Error).message, severity: 'error' });
        } finally {
            setBusyLabel(null);
        }
    };
    // Open the interactive HTML sheet (single page, in-page links) in a new tab.
    // The tab is opened synchronously on the click so the browser doesn't block it
    // after the build (see openHtmlBlob in peopleReviewApi).
    const openTempoHtmlView = async () => {
        const win = window.open('', '_blank');
        if (!win) {
            setSnackbar({ open: true, message: getString('popupBlocked'), severity: 'error' });
            return;
        }
        const building = getString('tempoPresentationBuilding');
        win.document.write(
            `<!doctype html><meta charset="utf-8"><title>TEMPO</title>` +
            `<body style="margin:0;display:flex;align-items:center;justify-content:center;` +
            `height:100vh;font-family:'Segoe UI',Arial,sans-serif;color:#1b2a4a;background:#f7f6f2">` +
            `<div style="font-size:18px;font-weight:600">${building}</div></body>`,
        );
        setBusyLabel(building);
        try {
            await openTempoHtml(rid, win);
        } catch (err) {
            setSnackbar({ open: true, message: (err as Error).message, severity: 'error' });
        } finally {
            setBusyLabel(null);
        }
    };

    // --- Reviewer notes (comments) ---
    const [commentsOpen, setCommentsOpen] = useState(false);
    // Count drives the header chip badge; the drawer re-fetches its own full list.
    const { data: comments = [] } = useQuery({
        queryKey: ['review_comments', rid],
        queryFn: () => fetchReviewComments(rid),
        enabled: !!rid,
        staleTime: 15_000,
    });

    // On-demand refresh for the read-only/supervisor view (replaces the old 30s
    // auto-poll). Invalidates only THIS person's mutable queries so a supervisor can
    // pull fresh data when they want it, without the page hammering the backend while
    // idle. Editors never see this — a background refetch would clobber their draft.
    const [refreshing, setRefreshing] = useState(false);
    const refreshPersonData = async () => {
        setRefreshing(true);
        try {
            await Promise.all([
                // rse_detail now also carries the employee header (level +
                // personal data), so this single refresh covers them.
                qc.invalidateQueries({ queryKey: ['rse_detail', sid, eid] }),
                qc.invalidateQueries({ queryKey: ['evaluations', rid] }),
                qc.invalidateQueries({ queryKey: ['employee_language_profile', employeeId] }),
                qc.invalidateQueries({ queryKey: ['review_comments', rid] }),
                qc.invalidateQueries({ queryKey: ['proposed_level', rid] }),
            ]);
        } finally {
            setRefreshing(false);
        }
    };

    // --- Competency level (current + proposed) ---
    const [proposedOpen, setProposedOpen] = useState(false);
    // Active live levels — drive the employee's current/base level (the base is
    // PERSISTED to employee.current_level_id, so it must stay active-only).
    const { data: allLevels = [] } = useQuery({
        queryKey: ['review_levels', 'active'],
        queryFn: () => fetchReviewLevels(true),
        staleTime: 5 * 60_000,
    });
    // The session's FROZEN levels for this review: counts the proposed level's
    // requirements for the Mark-reviewed gate (matching the backend, which counts
    // the frozen set) AND resolves the proposed level's name/sort_order even if it
    // was later deactivated (it's absent from active allLevels but present here).
    const { data: sessionLevels = [] } = useQuery({
        queryKey: ['session_levels', rid],
        queryFn: () => fetchSessionLevels(rid),
        enabled: !!rid,
        staleTime: 5 * 60_000,
    });
    // Saved proposed level — shares the drawer's query key, so saving in the
    // drawer (which invalidates it) refreshes the name shown on the button.
    const { data: proposedLevel } = useQuery({
        queryKey: ['proposed_level', rid],
        queryFn: () => fetchProposedLevel(rid),
        enabled: !!rid,
        staleTime: 30_000,
    });
    // Resolve a level by id from the active live set, falling back to the session's
    // frozen set (so a proposed/current level later deactivated still resolves).
    const findLevel = (id: number | null) =>
        id == null
            ? null
            : allLevels.find((l) => l.id === id) ??
              sessionLevels.find((l) => l.id === id) ??
              null;
    const proposedLevelKey = proposedLevel
        ? findLevel(proposedLevel.level_id)?.name_key ?? null
        : null;
    const proposedLevelName = proposedLevelKey ? getString(proposedLevelKey) : null;

    // Level "sense": compare the proposed level to the employee's current one by
    // sort_order — a higher rank reads as a proposed increase, equal as a
    // confirmation, lower as a decrease. Null when either side is missing. Kept
    // in lock-step with the backend (_tempo_data) so chip + album + gate agree.
    // Current level (and the personal-data facts below) come off the
    // people-review-scoped RSE detail — no admin GET /employees/{id}.
    const currentLevelId = rseDetail?.current_level_id ?? null;
    // Every employee must have a level: when none is set, fall back to the base
    // level (lowest sort_order). A developer setting decides whether that base is
    // only displayed or actually persisted to the employee record (and re-read).
    const baseLevelId = [...allLevels].sort((a, b) => a.sort_order - b.sort_order)[0]?.id ?? null;
    const displayLevelId = currentLevelId ?? baseLevelId;
    const currentLevelObj = findLevel(displayLevelId);
    const proposedLevelObj = proposedLevel ? findLevel(proposedLevel.level_id) : null;
    const proposedLevelSense: 'increase' | 'same' | 'decrease' | null =
        currentLevelObj && proposedLevelObj
            ? proposedLevelObj.sort_order > currentLevelObj.sort_order
                ? 'increase'
                : proposedLevelObj.sort_order < currentLevelObj.sort_order
                    ? 'decrease'
                    : 'same'
            : null;

    // Level-decision gate for Mark-reviewed (mirrors the backend rule): once the
    // employee has a current level, a proposed level is mandatory; unless it is a
    // decrease, every active requirement of that level must be justified.
    const levelDecisionComplete = (() => {
        if (!currentLevelId) return true;
        if (!proposedLevel) return false;
        if (proposedLevelSense === 'decrease') return true;
        // Count the FROZEN requirement set the employee actually saw (matches the
        // backend gate); fall back to the live level's active requirements.
        const frozenLevel = sessionLevels.find((l) => l.id === proposedLevel.level_id);
        const reqs = frozenLevel
            ? frozenLevel.requirements
            : (proposedLevelObj?.requirements ?? []).filter((r) => r.is_active);
        const answered = new Set(
            proposedLevel.answers.filter((a) => (a.facts ?? '').trim()).map((a) => a.requirement_id),
        );
        return reqs.every((r) => answered.has(r.id));
    })();

    const currentLevelMut = useMutation({
        mutationFn: (levelId: number) => setEmployeeCurrentLevel(employeeId!, levelId),
        onSuccess: async () => {
            // The header (current level) rides on the RSE detail now.
            await qc.invalidateQueries({ queryKey: ['rse_detail', sid, eid] });
        },
        onError: (err: Error) => setSnackbar({ open: true, message: err.message, severity: 'error' }),
    });

    // Persist-default-level mode: when an editable employee has no current level,
    // write the base level once. The re-read then surfaces it like a real level
    // (display-only mode skips this and just shows the base in the chip).
    const persistedLevelForRef = useRef<number | null>(null);
    useEffect(() => {
        if (!persistDefaultLevel || viewOnly) return;
        if (!employeeId || currentLevelId != null || baseLevelId == null) return;
        if (currentLevelMut.isPending || persistedLevelForRef.current === employeeId) return;
        persistedLevelForRef.current = employeeId;
        currentLevelMut.mutate(baseLevelId);
    }, [persistDefaultLevel, viewOnly, employeeId, currentLevelId, baseLevelId, currentLevelMut]);

    // --- Personal data (birth date / age, hire date / tenure, job-assigned date) ---
    const [birthDateOpen, setBirthDateOpen] = useState(false);
    const [hireDateOpen, setHireDateOpen] = useState(false);
    const [jobAssignedOpen, setJobAssignedOpen] = useState(false);
    // Personal-data facts (birth/hire/job-assigned dates, sex, marital status,
    // job & department name) travel on the RSE detail — no GET /employees/{id}.
    const personalData = rseDetail;
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
    // Editable path: skipped when a draft already exists, so in-progress edits survive
    // navigating away and back (the draft is the live source; autosave keeps it).
    const hydrationReady =
        !!rseDetail && !rseFetching && !evalFetching &&
        (!employeeId || (langProfile !== undefined && !langFetching));
    useEffect(() => {
        if (viewOnly) return; // view-only re-hydration is handled separately below
        if (!hydrationReady || !rseDetail || storeDraft) return;
        hydrateEvalDraft(rid, buildEvaluationDraft(rseDetail, evaluations, langProfile, getString));
    }, [viewOnly, hydrationReady, storeDraft, rid, rseDetail, evaluations, langProfile, getString, hydrateEvalDraft]);

    // Supervision (view-only) is a passive watch with NO local edits, so we keep the
    // draft in lock-step with the polled server data: re-hydrate whenever it changes.
    // Deps deliberately exclude `storeDraft` (re-hydrating mutates it) — React Query's
    // structural sharing keeps rseDetail/evaluations/langProfile references stable on
    // no-op refetches, so this only fires on a real change, not on every render.
    useEffect(() => {
        if (!viewOnly || !hydrationReady || !rseDetail) return;
        hydrateEvalDraft(rid, buildEvaluationDraft(rseDetail, evaluations, langProfile, getString));
    }, [viewOnly, hydrationReady, rid, rseDetail, evaluations, langProfile, getString, hydrateEvalDraft]);

    const addResult = (text: string) => {
        const trimmed = text.trim();
        if (!trimmed) return;
        setResults(prev => [...prev, trimmed]);
        setNewResultText('');
    };

    const removeResult = (index: number) => {
        setResults(prev => prev.filter((_, i) => i !== index));
    };

    const reviewedMut = useMutation({
        mutationFn: markReviewed,
        onSuccess: async (res) => {
            await qc.invalidateQueries({ queryKey: ['rse_detail', sid, eid] });
            await qc.invalidateQueries({ queryKey: ['session_employees', sessionId] });
            setSnackbar({ open: true, message: res.detail, severity: 'success' });
        },
        onError: (err: Error) => setSnackbar({ open: true, message: err.message, severity: 'error' }),
    });

    const revertMut = useMutation({
        mutationFn: revertRSE,
        onSuccess: async (res) => {
            await qc.invalidateQueries({ queryKey: ['rse_detail', sid, eid] });
            await qc.invalidateQueries({ queryKey: ['session_employees', sessionId] });
            setSnackbar({ open: true, message: res.detail, severity: 'success' });
        },
        onError: (err: Error) => setSnackbar({ open: true, message: err.message, severity: 'error' }),
    });

    const reopenMut = useMutation({
        mutationFn: reopenRSE,
        onSuccess: async (res) => {
            await qc.invalidateQueries({ queryKey: ['rse_detail', sid, eid] });
            await qc.invalidateQueries({ queryKey: ['session_employees', sessionId] });
            setSnackbar({ open: true, message: res.detail, severity: 'success' });
        },
        onError: (err: Error) => setSnackbar({ open: true, message: err.message, severity: 'error' }),
    });

    // Prev / Next employee navigation (keyed by employee id — the nested URL param).
    const siblingEmployeeIds = siblings.map(s => s.employee_id);
    const currentIdx = siblingEmployeeIds.indexOf(eid);
    const prevId = currentIdx > 0 ? siblingEmployeeIds[currentIdx - 1] : null;
    const nextId = currentIdx < siblingEmployeeIds.length - 1 ? siblingEmployeeIds[currentIdx + 1] : null;

    const goToEmployee = (employeeId: number) => {
        navigate({
            to: '/people_review/$sessionId/employee/$employeeId',
            params: { sessionId: String(sid), employeeId: String(employeeId) },
        });
    };

    const isLoading = rseLoading || evalLoading;
    const sessionStatus = rseDetail?.session_status ?? 'open';
    // Editable only if BOTH session is open AND employee status is open
    const isEditable = rseDetail?.status === 'open' && sessionStatus === 'open';
    // `isSupervision` / `viewOnly` are derived up top (they gate query polling).
    // Content editing is additionally gated by presentation mode and viewOnly;
    // header actions (autosave status / Mark reviewed / Revert) gate on `isEditable && !viewOnly`.
    const showEditing = isEditable && !presentationMode && !viewOnly;
    // Feedback editing splits by record ownership: an employee edits their own
    // self-feedback; a reviewer edits another's manager-feedback. This also closes
    // the edge of viewing your own review while in an oversight role.
    const isOwnRecord = myEmployeeId != null && rseDetail?.employee_id === myEmployeeId;
    const employeeFeedbackEditable = showEditing && isOwnRecord;
    const managerFeedbackEditable = showEditing && !isOwnRecord;
    const isSessionClosed = sessionStatus === 'closed';

    // Reviewer notes: writable only by an ACTIVE oversight/supervision reviewer
    // (any active role mode), on someone else's still-open review, outside
    // presentation mode. Crucially NOT derived from `showEditing`/`viewOnly` —
    // supervision is view-only for the evaluation yet may still comment. The
    // backend enforces the same rule (scope minus self + open). Reading is always
    // allowed; the drawer/chip stays available even when comments are read-only.
    const canComment = !!activeRoleId && !isOwnRecord && isEditable && !presentationMode;
    const showCommentsButton = comments.length > 0 || canComment;
    // The role a NEW note would be authored under — drives the composer's scopes
    // (supervision unlocks the 'to_oversight' escalation scope). Null when role-less.
    const myAuthorRole: 'oversight' | 'supervision' | null =
        activeRole?.link_target === 'department' ? 'supervision'
            : activeRole?.link_target === 'employee' ? 'oversight'
                : null;

    // Single compact "why is this read-only" reason, shown as a chip + tooltip next
    // to the status chip in the header. Replaces the old full-width banners, which
    // reflowed the whole page (pushing the tabs down) whenever the status changed.
    const readOnlyHint = isSupervision
        ? getString('supervisionViewOnly')
        : isSessionClosed
            ? getString('sessionClosedRevertHint')
            : rseDetail?.status && rseDetail.status !== 'open'
                ? getString('employeeStatusRevertHint', { status: rseDetail.status })
                : null;

    // --- Autosave -------------------------------------------------------------
    // Replaces the manual Save button: every editable change is pushed to the
    // server shortly after the last edit. Gated on `isEditable && !viewOnly` (NOT
    // presentation mode — that only hides the editing UI) and on the draft being
    // hydrated, so half-loaded data is never written back.
    const { status: autosaveStatus, flush: flushAutosave } = useEvaluationAutosave({
        rid,
        employeeId: employeeId ?? null,
        sessionId,
        enabled: isEditable && !viewOnly && hydrationReady && !!storeDraft,
        draft,
        onError: (message) => setSnackbar({ open: true, message, severity: 'error' }),
    });

    // The evaluation rows ARE the session's frozen dimension snapshot (created at
    // open / add-employee time from the then-active dimensions). Show them all,
    // regardless of a dimension's later is_active toggle, so a session's dimension
    // set never changes once it exists — deactivating a dimension globally leaves
    // already-existing sessions (open or closed) intact. New sessions still pick up
    // the new active set at open time.
    const visibleEvals = localEvals;

    const allFilled = visibleEvals.length > 0 && visibleEvals.every(evalFilled);
    const filledCount = visibleEvals.filter(evalFilled).length;
    const totalCount = visibleEvals.length;

    // Mark-reviewed is allowed only once every competence is scored AND the level
    // decision is settled (see levelDecisionComplete). The reason string explains
    // what is still missing; the backend enforces the same rule on the transition.
    const canMarkReviewed = allFilled && levelDecisionComplete;
    const markReviewedHint = !allFilled
        ? getString('fillAllDimensions', { filled: filledCount, total: totalCount })
        : !levelDecisionComplete
            ? (!proposedLevel ? getString('proposeLevelFirst') : getString('fillLevelDetails'))
            : getString('markAsReviewed');

    const competenceLabel = (key: string) => {
        const ev = localEvals.find(e => e.dimension_key === key);
        return competenceName(getString, key, ev?.dimension_name ?? key);
    };

    // Same color a competence gets in the dimension tabs below (same source).
    const competenceColor = (key: string) => {
        const idx = visibleEvals.findIndex(e => e.dimension_key === key);
        const ev = idx >= 0 ? visibleEvals[idx] : undefined;
        return getDimColor(key, idx >= 0 ? idx : 0, ev?.dimension_color);
    };

    // Header accents for the two summary boxes: dynamic so they never reuse a
    // competence's own color (which made the headers look like a competence),
    // while keeping the strong=good / develop=alert mood.
    const usedCompetenceColors = visibleEvals.map(e => competenceColor(e.dimension_key));
    const strongAccent = pickSummaryAccent('strong', usedCompetenceColors);
    const developAccent = pickSummaryAccent('develop', usedCompetenceColors);

    // A competence is "picked" if it appears in the matching summary section.
    const isStrongPicked = (key: string) => strongOptions.some(o => o.dimension_key === key);
    const isDevelopPicked = (key: string) => developOptions.some(o => o.dimension_key === key);

    // Push a line into the comment-input draft of one summary side. Facts prove
    // STRONG competences, so they copy only into the strong summary; the directions
    // for improvement feed only the to-develop summary. Each side has its own button.
    const appendDraft = (setter: Dispatch<SetStateAction<Record<string, string>>>, key: string, text: string) =>
        setter(prev => ({ ...prev, [key]: prev[key] ? `${prev[key]}\n${text}` : text }));
    const copyFactToStrong = (key: string, text: string) => appendDraft(setStrongDrafts, key, text);
    const copyImprovementToDevelop = (key: string, text: string) => appendDraft(setDevelopDrafts, key, text);

    // Effective full-list mode for the summary: the per-review switch, honoured
    // only while the admin has enabled the global setting. When on, both selects
    // offer every competence and star re-ratings no longer prune picked ones.
    const summaryFullListActive = allowSummaryFullList && summaryFullCompetenceList;

    // Summary select candidates, excluding already-picked ones. Default: the
    // top/bottom scored shortlist; full-list mode: every competence (page order).
    const strongCandidates = (summaryFullListActive ? visibleEvals : rankedCompetences(visibleEvals, 'desc'))
        .filter(e => !strongOptions.some(o => o.dimension_key === e.dimension_key))
        .map(e => ({ key: e.dimension_key, name: competenceLabel(e.dimension_key) }));
    const developCandidates = (summaryFullListActive ? visibleEvals : rankedCompetences(visibleEvals, 'asc'))
        .filter(e => !developOptions.some(o => o.dimension_key === e.dimension_key))
        .map(e => ({ key: e.dimension_key, name: competenceLabel(e.dimension_key) }));

    // Picked competences that no longer belong in their summary side by the
    // current scores (used when leaving full-list mode). A competence sits wrong
    // when it ranks on the OTHER side and not on its own — mirrors detectCompetenceFlip
    // but evaluated for every pick at once (and per side, so a both-sides pick is fine).
    const computeMisplacedSummary = (): { key: string; name: string; side: SummarySide }[] => {
        const strongKeys = new Set(rankedCompetences(visibleEvals, 'desc').map(e => e.dimension_key));
        const developKeys = new Set(rankedCompetences(visibleEvals, 'asc').map(e => e.dimension_key));
        const out: { key: string; name: string; side: SummarySide }[] = [];
        for (const o of strongOptions) {
            if (developKeys.has(o.dimension_key) && !strongKeys.has(o.dimension_key)) {
                out.push({ key: o.dimension_key, name: competenceLabel(o.dimension_key), side: 'strong' });
            }
        }
        for (const o of developOptions) {
            if (strongKeys.has(o.dimension_key) && !developKeys.has(o.dimension_key)) {
                out.push({ key: o.dimension_key, name: competenceLabel(o.dimension_key), side: 'develop' });
            }
        }
        return out;
    };

    // The full-list switch. Turning ON is always safe. Turning OFF re-arms ranked
    // selection: if any pick is now misplaced, hold the toggle and confirm their
    // removal first (cancel keeps the switch on so the summary stays consistent).
    const handleSummaryFullListToggle = (next: boolean) => {
        if (next) { setSummaryFullCompetenceList(true); return; }
        const misplaced = computeMisplacedSummary();
        if (misplaced.length === 0) { setSummaryFullCompetenceList(false); return; }
        setPendingSummaryReconcile(misplaced);
    };

    // Confirm leaving full-list mode: drop every misplaced competence from its
    // side, clearing the matching facts (strong) / improvements (develop) and any
    // mission link (when missions are restricted to the to-develop shortlist), then
    // turn the switch off — all in one draft update so the summary is never partial.
    const confirmSummaryReconcile = () => {
        if (!pendingSummaryReconcile) return;
        const strongDrop = new Set(pendingSummaryReconcile.filter(m => m.side === 'strong').map(m => m.key));
        const developDrop = new Set(pendingSummaryReconcile.filter(m => m.side === 'develop').map(m => m.key));
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
            missions: !allowFullCompetenceList
                ? d.missions.map(m => (m.dimension_key && developDrop.has(m.dimension_key) ? { ...m, dimension_key: null } : m))
                : d.missions,
            summaryFullCompetenceList: false,
        }));
        setPendingSummaryReconcile(null);
    };

    // Jump the facts section below to the tab of the given competence
    // (used when a competence is selected in the summary above).
    const activateCompetenceTab = (key: string) => {
        const idx = visibleEvals.findIndex(e => e.dimension_key === key);
        if (idx >= 0) setActiveTab(idx);
    };

    // --- Development plan (missions) ---
    // A numbered, add/remove list (like results) bounded by the developer min/max.
    // The add row lets the user set the linked competence in parallel with the text.
    const [newMissionText, setNewMissionText] = useState('');
    const [newMissionKpi, setNewMissionKpi] = useState('');
    const [newMissionCompetence, setNewMissionCompetence] = useState<string | null>(null);
    const addMission = (text: string, dimensionKey: string | null) => {
        const trimmed = text.trim();
        const trimmedKpi = newMissionKpi.trim();
        if (!trimmed) return;
        if (!trimmedKpi) return; // KPI is required
        if (missions.length >= maxMissions) return;
        setMissions(prev => [...prev, { text: trimmed, kpi: trimmedKpi, dimension_key: dimensionKey }]);
        setNewMissionText('');
        setNewMissionKpi('');
        setNewMissionCompetence(null);
    };
    const removeMission = (index: number) => {
        setMissions(prev => prev.filter((_, i) => i !== index));
    };
    const updateMission = (index: number, value: string) => {
        setMissions(prev => prev.map((m, i) => (i === index ? { ...m, text: value } : m)));
    };
    const setMissionCompetence = (index: number, dimension_key: string | null) => {
        setMissions(prev => prev.map((m, i) => (i === index ? { ...m, dimension_key } : m)));
    };
    const updateMissionKpi = (index: number, value: string) => {
        setMissions(prev => prev.map((m, i) => (i === index ? { ...m, kpi: value } : m)));
    };

    // Competences a mission may target: the "to develop" shortlist by default,
    // or every competence when the developer setting allows it AND the user opts
    // in. Each option carries its translated name + color, mirroring the page.
    const developCompetenceOptions = developOptions.map(o => ({
        key: o.dimension_key,
        name: competenceLabel(o.dimension_key),
        color: competenceColor(o.dimension_key),
    }));
    const allCompetenceOptions = visibleEvals.map(e => ({
        key: e.dimension_key,
        name: competenceLabel(e.dimension_key),
        color: competenceColor(e.dimension_key),
    }));

    // --- Competence summary helpers (shared by both sections) ---
    type SummarySetter = Dispatch<SetStateAction<SummaryOption[]>>;
    const addSummaryOption = (setter: SummarySetter, key: string) =>
        setter(prev => (prev.some(o => o.dimension_key === key) ? prev : [...prev, { dimension_key: key, comments: [] }]));
    const removeSummaryOption = (setter: SummarySetter, key: string) =>
        setter(prev => prev.filter(o => o.dimension_key !== key));
    // Removing a competence directly from the to-develop list also unlinks it from
    // any mission that targeted it — but only when missions are restricted to the
    // to-develop shortlist (allow-full off); with the full list allowed the link stays.
    // When a mission link would be dropped, confirm first (mirrors the star-flip flow).
    const removeDevelopOption = (key: string) => {
        const willUnlinkMission = !allowFullCompetenceList && missions.some(m => m.dimension_key === key);
        if (willUnlinkMission) {
            setPendingDevelopRemoval({ key, name: competenceLabel(key) });
            return;
        }
        removeSummaryOption(setDevelopOptions, key);
    };

    // Confirm a held to-develop removal: drop the competence and unlink its mission.
    const confirmDevelopRemoval = () => {
        if (!pendingDevelopRemoval) return;
        const { key } = pendingDevelopRemoval;
        removeSummaryOption(setDevelopOptions, key);
        setMissions(prev => prev.map(m => (m.dimension_key === key ? { ...m, dimension_key: null } : m)));
        setPendingDevelopRemoval(null);
    };
    const addSummaryComment = (setter: SummarySetter, key: string, text: string) =>
        setter(prev => prev.map(o => (o.dimension_key === key ? { ...o, comments: [...o.comments, text.trim()] } : o)));
    const removeSummaryComment = (setter: SummarySetter, key: string, index: number) =>
        setter(prev => prev.map(o => (o.dimension_key === key ? { ...o, comments: o.comments.filter((_, i) => i !== index) } : o)));
    const editSummaryComment = (setter: SummarySetter, key: string, index: number, text: string) =>
        setter(prev => prev.map(o => (o.dimension_key === key ? { ...o, comments: o.comments.map((c, i) => (i === index ? text.trim() : c)) } : o)));
    // Reorder a whole competence card within its summary list (drop it *before*
    // the target row — same convention as the in-competence fact reorder). The
    // array order IS the persisted order: autosave serializes it as-is and the
    // exports (HTML/PDF) flatten the bucket in this order, so no order number is
    // stored and every view stays in sync.
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

    // Star-change entry point for the dimension tabs. A re-rating that would move
    // a picked competence to the OPPOSITE summary list (by its new average) is held
    // back and confirmed via a dialog (it deletes that competence + its linked
    // facts/comments). Everything else applies immediately.
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
        );
        if (!side) { setCriterion(evalId, index, value); return; }
        // A competence leaving the develop list is no longer a "to develop" target,
        // so any mission focused on developing it loses its link — warn about that too.
        // Only when missions are restricted to the to-develop shortlist (allow-full off).
        const missionLinked = side === 'develop' && !allowFullCompetenceList
            && missions.some(m => m.dimension_key === ev.dimension_key);
        setPendingFlip({ evalId, index, value, key: ev.dimension_key, side, name: competenceLabel(ev.dimension_key), missionLinked });
    };

    // Confirm the held re-rating: flush other pending edits, then persist the flip
    // atomically on the server (one transaction), then mirror that exact write into
    // the local draft in a single update so the competence can never show in both
    // lists. The follow-up autosave re-pushes the same values — idempotent.
    const confirmFlip = async () => {
        if (!pendingFlip) return;
        const { evalId, index, value, key, side } = pendingFlip;
        await flushAutosave();
        try {
            await flipCompetence(evalId, { criterion_index: index, new_score: value, leaving_side: side });
        } catch (err) {
            setSnackbar({ open: true, message: (err as Error).message, severity: 'error' });
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
                        facts: side === 'strong' ? [] : e.facts,
                        improvements: side === 'develop' ? [] : e.improvements,
                    }
                    : e,
            ),
            strongOptions: side === 'strong' ? d.strongOptions.filter(o => o.dimension_key !== key) : d.strongOptions,
            developOptions: side === 'develop' ? d.developOptions.filter(o => o.dimension_key !== key) : d.developOptions,
            strongDrafts: side === 'strong' ? dropKey(d.strongDrafts) : d.strongDrafts,
            developDrafts: side === 'develop' ? dropKey(d.developDrafts) : d.developDrafts,
            // Drop the link from any mission that targeted this competence for development
            // (only when missions are restricted to the to-develop shortlist).
            missions: side === 'develop' && !allowFullCompetenceList
                ? d.missions.map(m => (m.dimension_key === key ? { ...m, dimension_key: null } : m))
                : d.missions,
        }));
        setPendingFlip(null);
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

    // Edit an existing fact in place (text already trimmed by the inline editor).
    const editFact = (evalId: number, index: number, text: string) => {
        const trimmed = text.trim();
        if (!trimmed) return;
        setLocalEvals(prev => prev.map(e =>
            e.id === evalId ? { ...e, facts: e.facts.map((f, i) => (i === index ? trimmed : f)) } : e,
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

    // --- Directions for improvement (a numbered list, like facts but per-competence only) ---
    const addImprovement = (evalId: number, text: string) => {
        const trimmed = text.trim();
        if (!trimmed) return;
        setLocalEvals(prev => prev.map(e =>
            e.id === evalId ? { ...e, improvements: [...e.improvements, trimmed] } : e,
        ));
        setNewImprovementTexts(prev => ({ ...prev, [evalId]: '' }));
    };

    const removeImprovement = (evalId: number, index: number) => {
        setLocalEvals(prev => prev.map(e =>
            e.id === evalId ? { ...e, improvements: e.improvements.filter((_, i) => i !== index) } : e,
        ));
    };

    // Edit an existing direction-for-improvement in place.
    const editImprovement = (evalId: number, index: number, text: string) => {
        const trimmed = text.trim();
        if (!trimmed) return;
        setLocalEvals(prev => prev.map(e =>
            e.id === evalId ? { ...e, improvements: e.improvements.map((imp, i) => (i === index ? trimmed : imp)) } : e,
        ));
    };

    // Reorder an improvement within the same competence (drop it *before* the target row).
    const reorderImprovement = (evalId: number, from: number, toRow: number) => {
        const to = from < toRow ? toRow - 1 : toRow;
        if (from === to) return;
        setLocalEvals(prev => prev.map(e => {
            if (e.id !== evalId) return e;
            const next = [...e.improvements];
            const [moved] = next.splice(from, 1);
            next.splice(to, 0, moved);
            return { ...e, improvements: next };
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

    // Move a numbered improvement from one competence to another (mirrors moveFact).
    const moveImprovement = (fromEvalId: number, index: number, toEvalId: number) => {
        if (fromEvalId === toEvalId) return;
        setLocalEvals(prev => {
            const imp = prev.find(e => e.id === fromEvalId)?.improvements[index];
            if (imp == null) return prev;
            return prev.map(e => {
                if (e.id === fromEvalId) return { ...e, improvements: e.improvements.filter((_, i) => i !== index) };
                if (e.id === toEvalId) return { ...e, improvements: [...e.improvements, imp] };
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
            <BusyBackdrop open={!!busyLabel} label={busyLabel ?? undefined} />
            <Box sx={{ p: { xs: 2, sm: 3 }, maxWidth: '100%', px: { xs: 2, sm: 4, md: 6 } }}>

                {/* Breadcrumbs — sticky just under the main menu (56px AppBar) so the
                    trail + employee name (the last crumb) stay visible while scrolling. */}
                <Breadcrumbs
                    separator={<NavigateNextIcon fontSize="small" />}
                    sx={{
                        position: 'sticky',
                        top: '56px',
                        zIndex: 5,
                        bgcolor: t.bg,
                        borderBottom: `1px solid ${t.borderLight}`,
                        py: 1.5,
                        mb: 2,
                    }}
                >
                    <Link to="/people_review" style={{ textDecoration: 'none', color: 'inherit' }}>
                        <Typography variant="body2" color="text.secondary">{getString('peopleReview')}</Typography>
                    </Link>
                    {rseDetail && (
                        // 'Only me' users aren't supposed to see the session
                        // itself — their crumb is plain text, not a link.
                        onlyMeMode ? (
                            <Typography variant="body2" color="text.secondary">
                                {rseDetail.session_name || `Session #${rseDetail.session_id}`}
                            </Typography>
                        ) : (
                            <Link
                                to="/people_review/$sessionId"
                                params={{ sessionId: String(rseDetail.session_id) }}
                                style={{ textDecoration: 'none', color: 'inherit' }}
                            >
                                <Typography variant="body2" color="text.secondary">
                                    {rseDetail.session_name || `Session #${rseDetail.session_id}`}
                                </Typography>
                            </Link>
                        )
                    )}
                    <Typography variant="body2" color="text.primary" fontWeight={600}>
                        {rseDetail?.employee_name ?? `#${rid}`}
                    </Typography>
                </Breadcrumbs>

                {rseDetail && (
                    <>
                        {/* Header: name (+ employee nav / presentation toggle) → progress & level controls */}
                        <Box sx={{ mb: 2.5 }}>
                            {/* Name + identity on the left; employee nav + presentation toggle opposite (right) */}
                            <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2, flexWrap: 'wrap' }}>
                                <Box sx={{ minWidth: 0 }}>
                                    <Stack direction="row" alignItems="center" spacing={1.5}>
                                        <EmployeeAvatar
                                            employeeId={employeeId}
                                            name={rseDetail.employee_name}
                                            scope="peopleReview"
                                            size={48}
                                            editable={showEditing}
                                            onSuccess={(message) => setSnackbar({ open: true, message, severity: 'success' })}
                                            onError={(message) => setSnackbar({ open: true, message, severity: 'error' })}
                                        />
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
                                        {readOnlyHint && (
                                            <Tooltip title={readOnlyHint}>
                                                <Chip
                                                    icon={<VisibilityIcon sx={{ fontSize: 13 }} />}
                                                    label={getString('viewOnly')}
                                                    size="small"
                                                    variant="outlined"
                                                    sx={{ fontSize: 11, cursor: 'help' }}
                                                />
                                            </Tooltip>
                                        )}
                                    </Stack>
                                    <Typography variant="body2" color={t.textMuted} mt={0.3}>
                                        {rseDetail.employee_code} · {rseDetail.session_name}
                                    </Typography>
                                </Box>

                                {/* Employee nav (prev/next) + presentation toggle — opposite the name */}
                                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
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

                                    {/* Reviewer notes — chip+badge opens the comments drawer.
                                        Shown when there are notes to read OR the user may add one. */}
                                    {/* TEMPO album PDF — tiny button, always available on the detail page */}
                                    <Tooltip title={getString('tempoPdfTooltip')}>
                                        <IconButton
                                            size="small"
                                            onClick={openTempoPdf}
                                            sx={{ color: t.textMuted }}
                                        >
                                            <PictureAsPdfIcon sx={{ fontSize: 18 }} />
                                        </IconButton>
                                    </Tooltip>
                                    {/* TEMPO album as an interactive HTML page (new tab) */}
                                    <Tooltip title={getString('tempoHtmlTooltip')}>
                                        <IconButton
                                            size="small"
                                            onClick={openTempoHtmlView}
                                            sx={{ color: t.textMuted }}
                                        >
                                            <ArticleOutlinedIcon sx={{ fontSize: 18 }} />
                                        </IconButton>
                                    </Tooltip>

                                    {/* Manual refresh — supervisors (read-only) have no auto-poll,
                                        so this is their way to pull fresh per-person data. */}
                                    {viewOnly && (
                                        <Tooltip title={getString('refresh') || 'Refresh'}>
                                            <IconButton
                                                size="small"
                                                onClick={refreshPersonData}
                                                disabled={refreshing}
                                                sx={{ color: t.textMuted }}
                                            >
                                                <RefreshIcon sx={{ fontSize: 18, animation: refreshing ? 'spin 0.8s linear infinite' : 'none', '@keyframes spin': { to: { transform: 'rotate(360deg)' } } }} />
                                            </IconButton>
                                        </Tooltip>
                                    )}

                                    {showCommentsButton && (
                                        <Tooltip title={getString('reviewCommentsTooltip')}>
                                            <Badge badgeContent={comments.length} color="primary" overlap="circular">
                                                <Button
                                                    size="small"
                                                    variant="outlined"
                                                    startIcon={<ChatBubbleOutlineIcon sx={{ fontSize: 16 }} />}
                                                    onClick={() => setCommentsOpen(true)}
                                                    sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 600, fontSize: 12 }}
                                                >
                                                    {getString('reviewComments')}
                                                </Button>
                                            </Badge>
                                        </Tooltip>
                                    )}

                                    {/* Oversight-manager settings (own record only) — tucked in the header */}
                                    {isOwnRecord && (
                                        <OversightManagerPicker
                                            editable={showEditing}
                                            getString={getString}
                                            onSuccess={(message) => setSnackbar({ open: true, message, severity: 'success' })}
                                            onError={(message) => setSnackbar({ open: true, message, severity: 'error' })}
                                        />
                                    )}

                                    {isEditable && !viewOnly && (
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

                            {/* Level & progress controls — the next line below the name */}
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
                                {isEditable && !viewOnly && (
                                    <Tooltip title={markReviewedHint} placement="top">
                                        <span>
                                            <Button
                                                size="small" variant="contained"
                                                startIcon={canMarkReviewed ? <CheckCircleIcon /> : <LockIcon />}
                                                onClick={async () => { await flushAutosave(); reviewedMut.mutate(rid); }}
                                                disabled={!canMarkReviewed || reviewedMut.isPending}
                                                sx={{
                                                    borderRadius: '8px', textTransform: 'none', fontWeight: 600, fontSize: 12,
                                                    bgcolor: canMarkReviewed ? '#2E7D32' : undefined,
                                                    '&:hover': { bgcolor: canMarkReviewed ? '#1B5E20' : undefined },
                                                }}
                                            >
                                                {getString('markReviewed')}
                                            </Button>
                                        </span>
                                    </Tooltip>
                                )}

                                {/* Revert buttons */}
                                {rseDetail.status === 'reviewed' && sessionStatus === 'open' && !viewOnly && (
                                    <Button
                                        size="small" variant="outlined" startIcon={<ReplayIcon />}
                                        onClick={() => revertMut.mutate(rid)}
                                        disabled={revertMut.isPending}
                                        sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 600, fontSize: 12 }}
                                    >
                                        {getString('revertToOpen')}
                                    </Button>
                                )}
                                {rseDetail.status === 'closed' && sessionStatus !== 'closed' && !viewOnly && (
                                    <>
                                        <Tooltip title={getString('revertToReviewed')}>
                                            <Button
                                                size="small" variant="outlined" color="warning" startIcon={<ReplayIcon />}
                                                onClick={() => revertMut.mutate(rid)}
                                                disabled={revertMut.isPending}
                                                sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 600, fontSize: 12 }}
                                            >
                                                {getString('revert')}
                                            </Button>
                                        </Tooltip>
                                        <Tooltip title={getString('setDirectlyToOpen')}>
                                            <Button
                                                size="small" variant="outlined" startIcon={<ReplayIcon />}
                                                onClick={() => reopenMut.mutate(rid)}
                                                disabled={reopenMut.isPending}
                                                sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 600, fontSize: 12 }}
                                            >
                                                {getString('setOpen')}
                                            </Button>
                                        </Tooltip>
                                    </>
                                )}

                                {/* Autosave status — replaces the old manual Save button. Every
                                    edit persists on its own; this only reports progress (and offers
                                    a retry if a background save failed). */}
                                {isEditable && !viewOnly && (
                                    autosaveStatus === 'error' ? (
                                        <Tooltip title={getString('autosaveFailedHint')}>
                                            <Button
                                                size="small" variant="outlined" color="error" startIcon={<ErrorOutlineIcon />}
                                                onClick={() => { void flushAutosave(); }}
                                                sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 600, fontSize: 12 }}
                                            >
                                                {getString('autosaveRetry')}
                                            </Button>
                                        </Tooltip>
                                    ) : (
                                        <Stack direction="row" alignItems="center" spacing={0.75} sx={{ px: 1, color: t.textMuted }}>
                                            {autosaveStatus === 'saving'
                                                ? <CircularProgress size={14} thickness={5} />
                                                : <CheckCircleIcon sx={{ fontSize: 16, color: '#2E7D32' }} />}
                                            <Typography fontSize={12} fontWeight={600} sx={{ whiteSpace: 'nowrap' }}>
                                                {autosaveStatus === 'saving' ? getString('saving') : getString('allChangesSaved')}
                                            </Typography>
                                        </Stack>
                                    )
                                )}

                            </Stack>
                        </Box>

                        {/* Read-only reason now lives as a chip + tooltip next to the status
                            chip in the header (above), so it no longer reflows the page. */}

                        {/* Employee data tabs: languages / feedback / results */}
                        <EmployeeDataTabs
                            dataTab={dataTab}
                            onDataTabChange={setDataTab}
                            isEditable={showEditing}
                            getString={getString}
                            personalInfo={
                                <PersonalInfoPanel
                                    employeeId={employeeId}
                                    isEditable={showEditing}
                                    getString={getString}
                                    birthDate={personalData?.birth_date}
                                    employeeAge={employeeAge}
                                    showEdit={showEditing && !!employeeId}
                                    onEditBirth={() => setBirthDateOpen(true)}
                                    sex={personalData?.sex ?? null}
                                    maritalStatus={personalData?.marital_status ?? null}
                                    langLevels={langLevels}
                                    langSel={langSel}
                                    setLangSel={setLangSel}
                                    onSuccess={(message) => setSnackbar({ open: true, message, severity: 'success' })}
                                    onError={(message) => setSnackbar({ open: true, message, severity: 'error' })}
                                    onSaved={() => qc.invalidateQueries({ queryKey: ['rse_detail', sid, eid] })}
                                />
                            }
                            jobInfo={
                                <JobInfoPanel
                                    getString={getString}
                                    jobName={personalData?.job_name}
                                    departmentName={personalData?.main_department_name}
                                    hireDate={personalData?.hire_date}
                                    employeeTenure={employeeTenure}
                                    jobAssignedDate={personalData?.job_assigned_date}
                                    positionDuration={positionDuration}
                                    showEdit={showEditing && !!employeeId}
                                    onEditHire={() => setHireDateOpen(true)}
                                    onEditJobAssigned={() => setJobAssignedOpen(true)}
                                    levels={allLevels}
                                    currentLevelId={displayLevelId}
                                    onCurrentLevelChange={(levelId) => currentLevelMut.mutate(levelId)}
                                    currentLevelDisabled={!employeeId || currentLevelMut.isPending}
                                    onOpenProposed={() => setProposedOpen(true)}
                                    proposedLevelName={proposedLevelName}
                                    proposedLevelSense={proposedLevelSense}
                                    proposedLevelStatus={proposedLevel?.status ?? null}
                                    talentStatusPanel={
                                        <TalentStatusPeriodPanel
                                            employeeId={employeeId}
                                            editable={canEditTalentStatus && showEditing}
                                            getString={getString}
                                            onSuccess={(message) => setSnackbar({ open: true, message, severity: 'success' })}
                                            onError={(message) => setSnackbar({ open: true, message, severity: 'error' })}
                                        />
                                    }
                                />
                            }
                            employeeFeedback={employeeFeedback}
                            onEmployeeFeedbackChange={setEmployeeFeedback}
                            employeeFeedbackEditable={employeeFeedbackEditable}
                            managerFeedback={managerFeedback}
                            onManagerFeedbackChange={setManagerFeedback}
                            managerFeedbackEditable={managerFeedbackEditable}
                            results={results}
                            newResultText={newResultText}
                            onNewResultTextChange={setNewResultText}
                            onAddResult={addResult}
                            onRemoveResult={removeResult}
                            employeeId={employeeId}
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
                                    <Tab label={getString('developmentPlan')} sx={{ textTransform: 'none', fontWeight: 600, fontSize: 12 }} />
                                </Tabs>

                                <Box sx={{ p: 2.5 }}>
                                    {analysisTab === 0 && (
                                        <DimensionChart evals={visibleEvals} getString={getString} />
                                    )}

                                    {analysisTab === 1 && (
                                        allFilled ? (
                                          <>
                                            {/* Per-review full-list switch — shown to the editor (employee /
                                                oversight manager) only when the admin has allowed it. On: both
                                                selects offer every competence and re-ratings stop removing picks. */}
                                            {allowSummaryFullList && showEditing && (
                                                <Box sx={{ mb: 2 }}>
                                                    <Tooltip title={getString('summaryUseFullCompetenceListHint')} placement="top">
                                                        <FormControlLabel
                                                            sx={{ m: 0 }}
                                                            control={
                                                                <Switch
                                                                    size="small"
                                                                    checked={summaryFullCompetenceList}
                                                                    onChange={e => handleSummaryFullListToggle(e.target.checked)}
                                                                />
                                                            }
                                                            label={
                                                                <Typography fontSize={12} fontWeight={600} color={t.textMuted}>
                                                                    {getString('summaryUseFullCompetenceList')}
                                                                </Typography>
                                                            }
                                                        />
                                                    </Tooltip>
                                                </Box>
                                            )}
                                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                                                <CompetenceSummarySection
                                                    title={getString('strongCompetences')}
                                                    accent={strongAccent}
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
                                                    onEditComment={(key, idx, text) => editSummaryComment(setStrongOptions, key, idx, text)}
                                                    onReorderOption={(from, to) => reorderSummaryOption(setStrongOptions, from, to)}
                                                    onSelectCompetence={activateCompetenceTab}
                                                />
                                                <CompetenceSummarySection
                                                    title={getString('competencesToDevelop')}
                                                    accent={developAccent}
                                                    options={developOptions}
                                                    candidates={developCandidates}
                                                    nameOf={competenceLabel}
                                                    colorOf={competenceColor}
                                                    isEditable={showEditing}
                                                    getString={getString}
                                                    drafts={developDrafts}
                                                    onDraftChange={(key, value) => setDevelopDrafts(prev => ({ ...prev, [key]: value }))}
                                                    onAddOption={key => addSummaryOption(setDevelopOptions, key)}
                                                    onRemoveOption={removeDevelopOption}
                                                    onAddComment={(key, text) => addSummaryComment(setDevelopOptions, key, text)}
                                                    onRemoveComment={(key, idx) => removeSummaryComment(setDevelopOptions, key, idx)}
                                                    onEditComment={(key, idx, text) => editSummaryComment(setDevelopOptions, key, idx, text)}
                                                    onReorderOption={(from, to) => reorderSummaryOption(setDevelopOptions, from, to)}
                                                    onSelectCompetence={activateCompetenceTab}
                                                />
                                            </Box>
                                          </>
                                        ) : (
                                            <Alert severity="info" sx={{ borderRadius: '10px' }}>
                                                {getString('fillAllCompetencesFirst')}
                                            </Alert>
                                        )
                                    )}

                                    {/* Development plan — the third analysis tab, right
                                        after the competence summary it builds on. */}
                                    {analysisTab === 2 && (
                                        <DevelopmentPlanSection
                                            isEditable={showEditing}
                                            getString={getString}
                                            missions={missions}
                                            onUpdateMission={updateMission}
                                            onUpdateMissionKpi={updateMissionKpi}
                                            onAddMission={addMission}
                                            onRemoveMission={removeMission}
                                            onSetMissionCompetence={setMissionCompetence}
                                            newMissionText={newMissionText}
                                            onNewMissionTextChange={setNewMissionText}
                                            newMissionKpi={newMissionKpi}
                                            onNewMissionKpiChange={setNewMissionKpi}
                                            newMissionCompetence={newMissionCompetence}
                                            onNewMissionCompetenceChange={setNewMissionCompetence}
                                            minMissions={minMissions}
                                            maxMissions={maxMissions}
                                            developCompetenceOptions={developCompetenceOptions}
                                            allCompetenceOptions={allCompetenceOptions}
                                            allowFullCompetenceList={allowFullCompetenceList}
                                        />
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
                                draggedItem={draggedItem}
                                setDraggedItem={setDraggedItem}
                                dragOverTab={dragOverTab}
                                setDragOverTab={setDragOverTab}
                                dragOverFactIndex={dragOverFactIndex}
                                setDragOverFactIndex={setDragOverFactIndex}
                                setPendingMove={setPendingMove}
                                newFactTexts={newFactTexts}
                                setNewFactTexts={setNewFactTexts}
                                newImprovementTexts={newImprovementTexts}
                                setNewImprovementTexts={setNewImprovementTexts}
                                setCriterion={handleCriterionChange}
                                addFact={addFact}
                                removeFact={removeFact}
                                editFact={editFact}
                                reorderFact={reorderFact}
                                addImprovement={addImprovement}
                                removeImprovement={removeImprovement}
                                editImprovement={editImprovement}
                                reorderImprovement={reorderImprovement}
                                isStrongPicked={isStrongPicked}
                                isDevelopPicked={isDevelopPicked}
                                copyFactToStrong={copyFactToStrong}
                                copyImprovementToDevelop={copyImprovementToDevelop}
                            />
                        )}
                    </>
                )}
            </Box>

            <ProposedLevelDrawer
                open={proposedOpen}
                onClose={() => setProposedOpen(false)}
                rseId={rid}
                currentLevelId={displayLevelId}
                setSnackbar={setSnackbar}
                canEdit={showEditing}
            />

            <ReviewCommentsDrawer
                open={commentsOpen}
                onClose={() => setCommentsOpen(false)}
                rseId={rid}
                canComment={canComment}
                myAuthorRole={myAuthorRole}
                myEmployeeId={myEmployeeId}
                setSnackbar={setSnackbar}
            />

            {/* TEMPO album PDF viewer — iframe in a wide dialog (the seed of the
                future presentation mode). The PDF is landscape A4, so the dialog is
                kept wide and short. */}
            <Dialog open={pdfOpen} onClose={closeTempoPdf} maxWidth="lg" fullWidth>
                <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    {getString('tempoPdfTitle')}
                    <Stack direction="row" spacing={1} alignItems="center">
                        <Button
                            size="small"
                            variant="outlined"
                            startIcon={<PictureAsPdfIcon sx={{ fontSize: 16 }} />}
                            onClick={downloadTempo}
                            sx={{ textTransform: 'none', fontWeight: 600 }}
                        >
                            {getString('downloadPdf')}
                        </Button>
                        <IconButton size="small" onClick={closeTempoPdf}><CloseIcon fontSize="small" /></IconButton>
                    </Stack>
                </DialogTitle>
                <DialogContent sx={{ p: 1.5, bgcolor: '#f7f6f2' }}>
                    {pdfError ? (
                        <Box sx={{ minHeight: '40vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Alert severity="error" sx={{ maxWidth: 480 }}>{pdfError}</Alert>
                        </Box>
                    ) : pdfLoading || !pdfUrl ? (
                        <Box sx={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <CircularProgress />
                        </Box>
                    ) : (
                        <Box
                            component="img"
                            src={pdfUrl}
                            alt={getString('tempoPdfTitle')}
                            sx={{ width: '100%', height: 'auto', display: 'block', borderRadius: '6px' }}
                        />
                    )}
                </DialogContent>
            </Dialog>

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
                        onSaved={() => qc.invalidateQueries({ queryKey: ['rse_detail', sid, eid] })}
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
                        onSaved={() => qc.invalidateQueries({ queryKey: ['rse_detail', sid, eid] })}
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
                        onSaved={() => qc.invalidateQueries({ queryKey: ['rse_detail', sid, eid] })}
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

            {/* Confirm moving a fact / direction-for-improvement to another competence tab */}
            <Dialog open={pendingMove != null} onClose={() => setPendingMove(null)} maxWidth="xs" fullWidth>
                <DialogTitle>
                    {getString(pendingMove?.kind === 'improvement' ? 'moveImprovementTitle' : 'moveFactTitle')}
                </DialogTitle>
                <DialogContent>
                    <DialogContentText sx={{ mb: 1 }}>
                        {getString(
                            pendingMove?.kind === 'improvement' ? 'moveImprovementConfirm' : 'moveFactConfirm',
                            { target: pendingMove?.toName ?? '' },
                        )}
                    </DialogContentText>
                    {pendingMove && (
                        <Typography fontSize={13} sx={{ fontStyle: 'italic', color: t.textMuted, wordBreak: 'break-word' }}>
                            “{pendingMove.text}”
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
                                if (pendingMove.kind === 'improvement') {
                                    moveImprovement(pendingMove.fromEvalId, pendingMove.index, pendingMove.toEvalId);
                                } else {
                                    moveFact(pendingMove.fromEvalId, pendingMove.index, pendingMove.toEvalId);
                                }
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

            {/* Confirm a star re-rating that flips a competence to the opposite
                summary list — it deletes the competence from its current list along
                with the facts/comments linked to it there. Applied atomically. */}
            <Dialog open={pendingFlip != null} onClose={() => setPendingFlip(null)} maxWidth="xs" fullWidth>
                <DialogTitle>{getString('flipCompetenceTitle')}</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        {getString(
                            pendingFlip?.side === 'strong' ? 'flipCompetenceFromStrong' : 'flipCompetenceFromDevelop',
                            { competence: pendingFlip?.name ?? '' },
                        )}
                    </DialogContentText>
                    {pendingFlip?.missionLinked && (
                        <DialogContentText sx={{ mt: 1.5, color: 'warning.main' }}>
                            {getString('flipCompetenceMissionWarning', { competence: pendingFlip?.name ?? '' })}
                        </DialogContentText>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setPendingFlip(null)} sx={{ textTransform: 'none' }}>
                        {getString('cancel')}
                    </Button>
                    <Button
                        variant="contained"
                        color="error"
                        onClick={() => { void confirmFlip(); }}
                        sx={{ textTransform: 'none' }}
                    >
                        {getString('flipCompetenceConfirm')}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Confirm a direct removal of a to-develop competence that is linked to a
                mission — the link is dropped on confirm (allow-full off only). */}
            <Dialog open={pendingDevelopRemoval != null} onClose={() => setPendingDevelopRemoval(null)} maxWidth="xs" fullWidth>
                <DialogTitle>{getString('removeDevelopCompetenceTitle')}</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        {getString('flipCompetenceMissionWarning', { competence: pendingDevelopRemoval?.name ?? '' })}
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setPendingDevelopRemoval(null)} sx={{ textTransform: 'none' }}>
                        {getString('cancel')}
                    </Button>
                    <Button
                        variant="contained"
                        color="error"
                        onClick={confirmDevelopRemoval}
                        sx={{ textTransform: 'none' }}
                    >
                        {getString('delete')}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Confirm leaving full-list mode when some picked competences no longer
                fit their side by the current scores — they are removed (facts/
                improvements cleared) and only then is the switch turned off. */}
            <Dialog open={pendingSummaryReconcile != null} onClose={() => setPendingSummaryReconcile(null)} maxWidth="xs" fullWidth>
                <DialogTitle>{getString('reconcileSummaryTitle')}</DialogTitle>
                <DialogContent>
                    <DialogContentText sx={{ mb: 1 }}>{getString('reconcileSummaryBody')}</DialogContentText>
                    <Stack spacing={0.5} sx={{ mt: 1 }}>
                        {pendingSummaryReconcile?.map((m) => (
                            <Typography key={`${m.side}-${m.key}`} fontSize={13} fontWeight={600} sx={{ wordBreak: 'break-word' }}>
                                • {m.name} — {getString(m.side === 'strong' ? 'strongCompetences' : 'competencesToDevelop')}
                            </Typography>
                        ))}
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setPendingSummaryReconcile(null)} sx={{ textTransform: 'none' }}>
                        {getString('cancel')}
                    </Button>
                    <Button
                        variant="contained"
                        color="error"
                        onClick={confirmSummaryReconcile}
                        sx={{ textTransform: 'none' }}
                    >
                        {getString('reconcileSummaryConfirm')}
                    </Button>
                </DialogActions>
            </Dialog>
        </AppShell>
    );
}

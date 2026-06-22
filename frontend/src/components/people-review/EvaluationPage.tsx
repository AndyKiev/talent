import { useState, useEffect, type Dispatch, type SetStateAction } from 'react';
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
    fetchProposedLevel,
    fetchEmployeeCurrentLevel,
    setEmployeeCurrentLevel,
    fetchEmployeePersonalData,
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
    type DraggedItem,
    type PendingMove,
    type PendingFlip,
    RSE_STATUS_COLORS,
    getDimColor,
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
import { useBooleanSetting } from '../../hooks/useAppSetting';
import { EmployeeDataTabs } from './evaluation/EmployeeDataTabs';
import { DimensionPanel } from './evaluation/DimensionPanel';
import { useEvaluationAutosave } from './evaluation/useEvaluationAutosave';
import EmployeeAvatar from '../ui/EmployeeAvatar';
import { OversightManagerPicker } from './OversightManagerPicker';

export function EvaluationPage() {
    const { sessionId: sessionIdParam, employeeId: employeeIdParam } = useParams({ strict: false }) as { sessionId: string; employeeId: string };
    const navigate = useNavigate();
    const qc = useQueryClient();
    const sid = Number(sessionIdParam);
    const eid = Number(employeeIdParam);
    const { t } = useTheme();
    const getString = useString({ str });
    const myEmployeeId = useAuthStore((s) => s.user?.id) ?? null;
    // Developer setting: when on, the talent status/period can be edited from
    // inside people-review (otherwise it's read-only here). Display is unaffected.
    const { enabled: canEditTalentStatus } = useBooleanSetting('people_review_edit_talent_status');

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
    // Supervisors watch live: poll the mutable per-person data every 30s. React Query
    // pauses the interval while the tab is unfocused, so idle load stays negligible.
    // Editors never poll — they own the in-memory draft and must not be clobbered.
    const pollMs: number | false = viewOnly ? 30_000 : false;

    const { data: rseDetail, isLoading: rseLoading, isFetching: rseFetching } = useQuery({
        queryKey: ['rse_detail', sid, eid],
        queryFn: () => fetchRSEBySessionEmployee(sid, eid),
        staleTime: 30_000,
        refetchInterval: pollMs,
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
        refetchInterval: pollMs,
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
        refetchInterval: pollMs,
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

    // --- TEMPO album (viewer dialog) ---
    // Lazily fetch the album as a PNG blob URL (axios sends the JWT; a plain src
    // can't) and show it inline in an <img> — browsers always render images,
    // whereas an application/pdf iframe is downloaded in many of them. The PDF is
    // offered as an explicit download. The URL is revoked on close.
    const [pdfOpen, setPdfOpen] = useState(false);
    const [pdfUrl, setPdfUrl] = useState<string | null>(null);
    const [pdfLoading, setPdfLoading] = useState(false);
    const [pdfError, setPdfError] = useState<string | null>(null);
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
        try {
            await downloadTempoPdf(rid, fileName);
        } catch (err) {
            setSnackbar({ open: true, message: (err as Error).message, severity: 'error' });
        }
    };
    // Open the interactive HTML sheet (single page, in-page links) in a new tab.
    const openTempoHtmlView = async () => {
        try {
            await openTempoHtml(rid);
        } catch (err) {
            setSnackbar({ open: true, message: (err as Error).message, severity: 'error' });
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
        refetchInterval: pollMs,
    });

    // --- Competency level (current + proposed) ---
    const [proposedOpen, setProposedOpen] = useState(false);
    const { data: allLevels = [] } = useQuery({
        queryKey: ['review_levels', 'active'],
        queryFn: () => fetchReviewLevels(true),
        staleTime: 5 * 60_000,
    });
    // Saved proposed level — shares the drawer's query key, so saving in the
    // drawer (which invalidates it) refreshes the name shown on the button.
    const { data: proposedLevel } = useQuery({
        queryKey: ['proposed_level', rid],
        queryFn: () => fetchProposedLevel(rid),
        enabled: !!rid,
        staleTime: 30_000,
        refetchInterval: pollMs,
    });
    const proposedLevelKey = proposedLevel
        ? allLevels.find((l) => l.id === proposedLevel.level_id)?.name_key ?? null
        : null;
    const proposedLevelName = proposedLevelKey ? getString(proposedLevelKey) : null;
    const { data: empLevel } = useQuery({
        queryKey: ['employee_current_level', employeeId],
        queryFn: () => fetchEmployeeCurrentLevel(employeeId!),
        enabled: !!employeeId,
        staleTime: 30_000,
        refetchInterval: pollMs,
    });

    // Level "sense": compare the proposed level to the employee's current one by
    // sort_order — a higher rank reads as a proposed increase, equal as a
    // confirmation, lower as a decrease. Null when either side is missing. Kept
    // in lock-step with the backend (_tempo_data) so chip + album + gate agree.
    const currentLevelId = empLevel?.current_level_id ?? null;
    const currentLevelObj = allLevels.find((l) => l.id === currentLevelId) ?? null;
    const proposedLevelObj = proposedLevel
        ? allLevels.find((l) => l.id === proposedLevel.level_id) ?? null
        : null;
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
        const reqs = (proposedLevelObj?.requirements ?? []).filter((r) => r.is_active);
        const answered = new Set(
            proposedLevel.answers.filter((a) => (a.facts ?? '').trim()).map((a) => a.requirement_id),
        );
        return reqs.every((r) => answered.has(r.id));
    })();

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
        refetchInterval: pollMs,
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
        setPendingFlip({ evalId, index, value, key: ev.dimension_key, side, name: competenceLabel(ev.dimension_key) });
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
                        <Link
                            to="/people_review/$sessionId"
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
                        {/* Header: name (+ employee nav / presentation toggle) → progress & level controls */}
                        <Box sx={{ mb: 2.5 }}>
                            {/* Name + identity on the left; employee nav + presentation toggle opposite (right) */}
                            <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2, flexWrap: 'wrap' }}>
                                <Box sx={{ minWidth: 0 }}>
                                    <Stack direction="row" alignItems="center" spacing={1.5}>
                                        <EmployeeAvatar
                                            employeeId={employeeId}
                                            name={rseDetail.employee_name}
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
                                    currentLevelId={empLevel?.current_level_id ?? null}
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
                                                    onEditComment={(key, idx, text) => editSummaryComment(setStrongOptions, key, idx, text)}
                                                    onReorderOption={(from, to) => reorderSummaryOption(setStrongOptions, from, to)}
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
                                                    onEditComment={(key, idx, text) => editSummaryComment(setDevelopOptions, key, idx, text)}
                                                    onReorderOption={(from, to) => reorderSummaryOption(setDevelopOptions, from, to)}
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
                currentLevelId={currentLevelId}
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
        </AppShell>
    );
}

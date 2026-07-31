import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate, Link } from '@tanstack/react-router';
import {
    Alert,
    Box,
    Breadcrumbs,
    Button,
    CircularProgress,
    Dialog,
    DialogContent,
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
import VisibilityIcon from '@mui/icons-material/Visibility';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import CloseIcon from '@mui/icons-material/Close';
import dayjs from 'dayjs';
import EmployeeDateDialog from './personal-data/EmployeeDateDialog';
import AppShell from '../layout/AppShell.tsx';
import { markReviewed, revertRSE, reopenRSE } from './peopleReviewApi';
import { ProposedLevelDrawer } from './ProposedLevelDrawer';
import { ReviewCommentsDrawer } from './ReviewCommentsDrawer';
import useString from '../../hooks/useString';
import { str } from '../../strings/str';
import { useAuthStore } from '../../store/authStore';
import { defaultLangShortName } from '../../utils/eNums';
import { useTheme } from '../theme/useTheme';
import {
    getDimColor,
    pickSideAccent,
    competenceName,
    evalFilled,
    formatYearsMonths,
    DimensionSide,
} from './evaluation/evaluationHelpers';
import { isRseEditable } from './rseStatus';
import { DimensionChart } from './evaluation/DimensionChart';
import { RseDimensionSection } from './evaluation/RseDimensionSection';
import { PersonalInfoPanel } from './evaluation/PersonalInfoPanel';
import { JobInfoPanel } from './evaluation/JobInfoPanel';
import { TalentStatusPeriodPanel } from './evaluation/TalentStatusPeriodPanel';
import { useBooleanSetting, useIntegerSetting } from '../../hooks/useAppSetting';
import { useFrozenBooleanSetting } from './useFrozenSetting';
import { EmployeeDataTabs } from './evaluation/EmployeeDataTabs';
import { DevelopmentPlanSection } from './evaluation/DevelopmentPlanSection';
import { DimensionPanel } from './evaluation/DimensionPanel';
import { UnlinkedFactsDrawer } from './evaluation/UnlinkedFactsDrawer';
import ConfirmDeleteDialog from '../ui/ConfirmDeleteDialog';
import { useEvaluationAutosave } from './evaluation/useEvaluationAutosave';
import BusyBackdrop from '../ui/BusyBackdrop';
import { useOnlyMeMode } from './useOnlyMeMode';
import { EvaluationHeader } from './evaluation/EvaluationHeader';
import { EvaluationConfirmDialogs } from './evaluation/EvaluationConfirmDialogs';
import { useEvaluationQueries } from './evaluation/hooks/useEvaluationQueries';
import { useEvaluationDraft } from './evaluation/hooks/useEvaluationDraft';
import { useTempoAlbum } from './evaluation/hooks/useTempoAlbum';
import { useEmployeeLevel } from './evaluation/hooks/useEmployeeLevel';
import { useRseDimensions } from './evaluation/hooks/useRseDimensions';
import { useDimensionFacts } from './evaluation/hooks/useDimensionFacts';
import { useSectionOrder } from './evaluation/hooks/useSectionOrder';
import { SectionOrderEditor } from './evaluation/SectionOrderEditor';
import { EvaluationSection } from './evaluation/sectionOrder';

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
    // inside people-review. Read from the SESSION-FROZEN snapshot, not the live
    // setting — a settings change after open must not re-gate this session.
    const { enabled: canEditTalentStatus } = useFrozenBooleanSetting(sid, 'people_review_edit_talent_status');
    // Min competences each summary select offers. The development-plan settings
    // (mission counts, KPI length, competence-list mode) are read inside
    // MissionsPanel now, since the plan is no longer part of this page's draft.
    const { value: summaryMinOptions } = useIntegerSetting('pr_summary_min_options', 2);
    // When ON, each review may switch its two competence-summary selects to the
    // full competence list. Session-frozen, same as canEditTalentStatus above.
    const { enabled: allowSummaryFullList } = useFrozenBooleanSetting(sid, 'people_review_summary_full_competence_list');
    // When ON, an employee with no current level gets the base level persisted.
    const { enabled: persistDefaultLevel } = useBooleanSetting('employee_default_level_persist');

    // 'info' is for guidance, not failure — the copy-to-summary hints (target
    // card not open / line already there) are refusals, not errors.
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' | 'info' });
    const [activeTab, setActiveTab] = useState(0);
    // Presentation mode: hide every editing affordance for a clean read-only view
    // even while the record is technically editable (job done, just presenting).
    const [presentationMode, setPresentationMode] = useState(false);

    // --- Section stacking order (developer default + personal override) -------
    const {
        order: sectionOrder, setOrder: setSectionOrder,
        reorderMode: sectionReorderMode, setReorderMode: setSectionReorderMode,
    } = useSectionOrder({
        onError: (message) => setSnackbar({ open: true, message, severity: 'error' }),
    });

    // --- Data (queries + scope realign) ---------------------------------------
    const {
        activeRoleId, activeRole, isSupervision, viewOnly,
        rseDetail, rseLoading, rid, sessionId,
        siblings, evaluations, evalLoading,
        langLevels, employeeId, langProfile, langLoading,
        dimensionTypes, dimensionTypesUnavailable, feedbackTypes,
        factTypes, unlinkedFacts, refetchUnlinkedFacts,
        comments, allLevels, sessionLevels, proposedLevel,
        refreshPersonData, refreshing, realignTargetId,
    } = useEvaluationQueries(sid, eid);

    // --- Competency level (current + proposed) --------------------------------
    const [proposedOpen, setProposedOpen] = useState(false);
    const {
        displayLevelId, proposedLevelName, proposedLevelSense,
        levelDecisionComplete, currentLevelMut,
    } = useEmployeeLevel({
        sid, eid, rseDetail, employeeId, viewOnly,
        allLevels, sessionLevels, proposedLevel, persistDefaultLevel, getString,
        onError: (message) => setSnackbar({ open: true, message, severity: 'error' }),
    });

    // --- Editable draft (zustand) ---------------------------------------------
    const {
        storeDraft, draft, updateEvalDraft, hydrationReady,
        setLocalEvals, setLangSel, setEmployeeFeedback, setManagerFeedback,
        setResults,
        setStrongOptions, setDevelopOptions, setStrongDrafts, setDevelopDrafts,
        setSummaryFullCompetenceList,
    } = useEvaluationDraft({
        rid, rseDetail, rseLoading, evaluations, evalLoading,
        employeeId, langProfile, langLoading, viewOnly, getString, dimensionTypes,
    });
    const {
        localEvals, langSel, employeeFeedback, managerFeedback,
        results,
        strongOptions, developOptions, strongDrafts, developDrafts,
        summaryFullCompetenceList,
    } = draft;

    // --- TEMPO album (viewer dialog) ------------------------------------------
    const {
        pdfOpen, pdfUrl, pdfLoading, pdfError, busyLabel,
        openTempoPdf, closeTempoPdf, downloadTempo, openTempoHtmlView,
        readyHtmlUrl, openReadyHtml, dismissReadyHtml,
    } = useTempoAlbum({
        rid, rseDetail, getString,
        onError: (message) => setSnackbar({ open: true, message, severity: 'error' }),
    });

    // --- Reviewer notes (comments) ---
    const [commentsOpen, setCommentsOpen] = useState(false);
    // The pool of facts registered without a competence. Non-modal drawer: the
    // competence tabs behind it stay visible and are the drop targets.
    const [unlinkedFactsOpen, setUnlinkedFactsOpen] = useState(false);

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

    const addResult = (text: string) => {
        const trimmed = text.trim();
        if (!trimmed) return;
        setResults(prev => [...prev, trimmed]);
        setNewResultText('');
    };
    const removeResult = (index: number) => {
        setResults(prev => prev.filter((_, i) => i !== index));
    };
    // Drop the dragged result BEFORE the target row. The array order IS the
    // persisted order — autosave sends the list and the server rewrites
    // sort_order from the index — so the visible "1., 2., 3." renumbers itself.
    const reorderResult = (from: number, toRow: number) => {
        const to = from < toRow ? toRow - 1 : toRow;
        if (from === to) return;
        setResults(prev => {
            const next = [...prev];
            const [moved] = next.splice(from, 1);
            next.splice(to, 0, moved);
            return next;
        });
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
    // (single source of truth: rseStatus.ts, shared with the roster page).
    const isEditable = isRseEditable(rseDetail?.status, sessionStatus);
    // Content editing is additionally gated by presentation mode and viewOnly;
    // header actions gate on `isEditable && !viewOnly`.
    const showEditing = isEditable && !presentationMode && !viewOnly;
    // Feedback editing splits by record ownership: an employee edits their own
    // self-feedback; a reviewer edits another's manager-feedback.
    const isOwnRecord = myEmployeeId != null && rseDetail?.employee_id === myEmployeeId;
    const employeeFeedbackEditable = showEditing && isOwnRecord;
    const managerFeedbackEditable = showEditing && !isOwnRecord;
    const isSessionClosed = sessionStatus === 'closed';

    // Reviewer notes: writable only by an ACTIVE oversight/supervision reviewer, on
    // someone else's still-open review, outside presentation mode. NOT derived from
    // showEditing/viewOnly — supervision is view-only yet may still comment.
    const canComment = !!activeRoleId && !isOwnRecord && isEditable && !presentationMode;
    const showCommentsButton = comments.length > 0 || canComment;
    // The role a NEW note would be authored under (oversight: to_subject;
    // supervision: to_oversight — see /review-comments skill). Null when role-less.
    const myAuthorRole: 'oversight' | 'supervision' | null =
        activeRole?.link_target === 'department' ? 'supervision'
            : activeRole?.link_target === 'employee' ? 'oversight'
                : null;

    // Single compact "why is this read-only" reason (chip + tooltip in the header).
    const readOnlyHint = isSupervision
        ? getString('supervisionViewOnly')
        : isSessionClosed
            ? getString('sessionClosedRevertHint')
            : rseDetail?.status && rseDetail.status !== 'open'
                ? getString('employeeStatusRevertHint', { status: rseDetail.status })
                : null;

    // --- Autosave -------------------------------------------------------------
    // Every editable change is pushed to the server shortly after the last edit.
    // Gated on `isEditable && !viewOnly` and on the draft being hydrated.
    const { status: autosaveStatus, flush: flushAutosave } = useEvaluationAutosave({
        rid,
        employeeId: employeeId ?? null,
        sessionId,
        enabled: isEditable && !viewOnly && hydrationReady && !!storeDraft,
        draft,
        dimensionTypes,
        feedbackTypes,
        onError: (message) => setSnackbar({ open: true, message, severity: 'error' }),
    });

    // The evaluation rows ARE the session's frozen dimension snapshot — show them
    // all regardless of a dimension's later is_active toggle.
    const visibleEvals = localEvals;

    const allFilled = visibleEvals.length > 0 && visibleEvals.every(evalFilled);
    const filledCount = visibleEvals.filter(evalFilled).length;
    const totalCount = visibleEvals.length;

    // Mark-reviewed is allowed only once every competence is scored AND the level
    // decision is settled; the reason string explains what is still missing.
    const canMarkReviewed = allFilled && levelDecisionComplete;
    const markReviewedHint = !allFilled
        ? getString('fillAllDimensions', { filled: filledCount, total: totalCount })
        : !levelDecisionComplete
            ? (!proposedLevel ? getString('proposeLevelFirst') : getString('fillLevelDetails'))
            : getString('markAsReviewed');

    // Prefer the name the SERVER resolved for a picked competence (it applies the
    // same competence<PascalKey> rule in the user's language), so the summary card
    // and the tab below it can never disagree. Candidates are built from the
    // evaluation rows, which have no server-resolved name — hence the fallback.
    const competenceLabel = (key: string) => {
        const picked = [...strongOptions, ...developOptions].find(o => o.dimension_key === key);
        if (picked?.dimension_name) return picked.dimension_name;
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
    // competence's own color, while keeping the strong=good / develop=alert mood.
    const usedCompetenceColors = visibleEvals.map(e => competenceColor(e.dimension_key));
    const strongAccent = pickSideAccent(DimensionSide.Strong, usedCompetenceColors);
    const developAccent = pickSideAccent(DimensionSide.Develop, usedCompetenceColors);

    // Targets of the drawer's "file into…" menu — the click path that stands in
    // for dragging where drag cannot work (touch, or the drawer covering the tabs).
    // Plain map, not memoized: `competenceLabel` / `competenceColor` are redefined
    // each render, so a useMemo here would recompute anyway — and the list is one
    // entry per competence.
    const drawerCompetences = visibleEvals.map(e => ({
        evalId: e.id,
        name: competenceLabel(e.dimension_key),
        color: competenceColor(e.dimension_key),
    }));

    // A competence is "picked" if it appears in the matching summary section.
    const isStrongPicked = (key: string) => strongOptions.some(o => o.dimension_key === key);
    const isDevelopPicked = (key: string) => developOptions.some(o => o.dimension_key === key);

    // Effective full-list mode: the per-review switch, honoured only while the
    // admin has enabled the global setting.
    const summaryFullListActive = allowSummaryFullList && summaryFullCompetenceList;

    // --- Competence summary + flip/reconcile handlers -------------------------
    const {
        strongCandidates, developCandidates,
        copyFactToStrong, copyImprovementToDevelop, activateCompetenceTab,
        setStrongOpenCard, setDevelopOpenCard,
        addDimensionOption, removeDimensionOption, removeDevelopOption,
        addDimensionComment, removeDimensionComment, editDimensionComment, reorderDimensionOption,
        handleSummaryFullListToggle, confirmSummaryReconcile,
        handleCriterionChange, confirmFlip,
        pendingFlip, setPendingFlip,
        pendingSummaryReconcile, setPendingSummaryReconcile,
    } = useRseDimensions({
        rid, updateEvalDraft,
        localEvals, strongOptions, developOptions,
        visibleEvals, competenceLabel, isStrongPicked, isDevelopPicked, summaryFullListActive,
        setLocalEvals, setDevelopOptions, setStrongDrafts, setDevelopDrafts,
        setSummaryFullCompetenceList,
        summaryMinOptions, dimensionTypes, getString, flushAutosave, setActiveTab,
        strongDrafts, developDrafts,
        onError: (message) => setSnackbar({ open: true, message, severity: 'error' }),
        onNotice: (message) => setSnackbar({ open: true, message, severity: 'info' }),
    });

    // --- Facts / directions-for-improvement handlers --------------------------
    const {
        newFactTexts, setNewFactTexts,
        newImprovementTexts, setNewImprovementTexts,
        draggedItem, setDraggedItem,
        dragOverTab, setDragOverTab,
        dragOverFactIndex, setDragOverFactIndex,
        pendingMove, setPendingMove,
        addFact, removeFact, editFact, reorderFact,
        addImprovement, removeImprovement, editImprovement, reorderImprovement,
        moveFact, moveImprovement,
        linkFromPool, unlinkFact, unlinkImprovement,
        createPoolFact, editPoolFact, changePoolFactType,
        requestDeleteFromPool, pendingFactDelete, setPendingFactDelete, confirmFactDelete,
    } = useDimensionFacts({
        employeeId, factTypes, localEvals, setLocalEvals,
        onError: (message) => setSnackbar({ open: true, message, severity: 'error' }),
        onPoolChanged: () => { void refetchUnlinkedFacts(); },
    });

    // Scope switched and the URL employee fell out of it — the queries hook is
    // redirecting to the first in-scope employee; show a spinner meanwhile
    // instead of flashing the empty (rseDetail-less) body.
    if (realignTargetId != null || isLoading) {
        return (
            <AppShell>
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 6 }}><CircularProgress /></Box>
            </AppShell>
        );
    }

    // The summary's side rows are missing, so the evaluation draft cannot be
    // built and the page would render silently empty. Almost always a database
    // that never had seeds/seed_review_session_employee_dimension_types.py run against it —
    // say so rather than showing a blank review.
    if (dimensionTypesUnavailable) {
        return (
            <AppShell>
                <Box sx={{ p: { xs: 2, sm: 3 }, maxWidth: 900, mx: 'auto', width: '100%' }}>
                    <Alert severity="error" sx={{ borderRadius: '10px' }}>
                        {getString('dimensionTypesUnavailable')}
                    </Alert>
                </Box>
            </AppShell>
        );
    }

    // Loaded, but the record is out of the current view's scope (404) and there
    // is no in-scope employee to realign to. Render an explicit notice.
    if (!rseDetail) {
        return (
            <AppShell>
                <Box sx={{ p: { xs: 2, sm: 3 }, maxWidth: 900, mx: 'auto', width: '100%' }}>
                    <Breadcrumbs separator={<NavigateNextIcon fontSize="small" />} sx={{ mb: 2 }}>
                        <Link to="/people_review" style={{ textDecoration: 'none', color: 'inherit' }}>
                            <Typography variant="body2" color="text.secondary">{getString('peopleReview')}</Typography>
                        </Link>
                    </Breadcrumbs>
                    <Alert severity="info" icon={<VisibilityIcon />} sx={{ borderRadius: '10px' }}>
                        {getString('employeeNotInScope')}
                    </Alert>
                </Box>
            </AppShell>
        );
    }

    return (
        <AppShell>
            <BusyBackdrop open={!!busyLabel} label={busyLabel ?? undefined} />
            <Box sx={{ p: { xs: 2, sm: 3 }, maxWidth: 1800, mx: 'auto', width: '100%' }}>

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
                        {/* Header: name + nav + progress & level controls */}
                        <EvaluationHeader
                            getString={getString}
                            rseDetail={rseDetail}
                            employeeId={employeeId}
                            showEditing={showEditing}
                            onSuccess={(message) => setSnackbar({ open: true, message, severity: 'success' })}
                            onError={(message) => setSnackbar({ open: true, message, severity: 'error' })}
                            readOnlyHint={readOnlyHint}
                            prevId={prevId}
                            nextId={nextId}
                            goToEmployee={goToEmployee}
                            siblings={siblings}
                            eid={eid}
                            currentIdx={currentIdx}
                            onOpenTempoPdf={openTempoPdf}
                            onOpenTempoHtml={openTempoHtmlView}
                            viewOnly={viewOnly}
                            onRefresh={refreshPersonData}
                            refreshing={refreshing}
                            showCommentsButton={showCommentsButton}
                            commentsCount={comments.length}
                            onOpenComments={() => setCommentsOpen(true)}
                            showUnlinkedFactsButton={!presentationMode}
                            unlinkedFactsCount={unlinkedFacts.length}
                            onOpenUnlinkedFacts={() => setUnlinkedFactsOpen(true)}
                            isOwnRecord={isOwnRecord}
                            isEditable={isEditable}
                            presentationMode={presentationMode}
                            setPresentationMode={setPresentationMode}
                            sectionReorderMode={sectionReorderMode}
                            setSectionReorderMode={setSectionReorderMode}
                            allFilled={allFilled}
                            filledCount={filledCount}
                            totalCount={totalCount}
                            markReviewedHint={markReviewedHint}
                            canMarkReviewed={canMarkReviewed}
                            onMarkReviewed={async () => { await flushAutosave(); reviewedMut.mutate(rid); }}
                            markReviewedPending={reviewedMut.isPending}
                            sessionStatus={sessionStatus}
                            onRevert={() => revertMut.mutate(rid)}
                            revertPending={revertMut.isPending}
                            onReopen={() => reopenMut.mutate(rid)}
                            reopenPending={reopenMut.isPending}
                            autosaveStatus={autosaveStatus}
                            onAutosaveRetry={() => { void flushAutosave(); }}
                        />

                        {/* The three big sections. Their stacking is a personal
                            preference (see useSectionOrder): they live in a flex
                            column and each one carries its CSS `order`, so the
                            markup stays put while the view re-stacks. Reorder
                            mode replaces them with the draggable strips. */}
                        {sectionReorderMode && !presentationMode ? (
                            <SectionOrderEditor
                                order={sectionOrder}
                                onChange={setSectionOrder}
                                getString={getString}
                            />
                        ) : (
                        <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                        <Box sx={{ order: sectionOrder.indexOf(EvaluationSection.EmployeeData) }}>
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
                            onReorderResult={reorderResult}
                            employeeId={employeeId}

                        />
                        </Box>

                        <Box sx={{ order: sectionOrder.indexOf(EvaluationSection.Analysis) }}>
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
                                            {/* Per-review full-list switch — shown to the editor only when
                                                the admin has allowed it. */}
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
                                                <RseDimensionSection
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
                                                    onAddOption={key => addDimensionOption(setStrongOptions, key)}
                                                    onRemoveOption={key => removeDimensionOption(setStrongOptions, key)}
                                                    onAddComment={(key, text) => addDimensionComment(setStrongOptions, key, text)}
                                                    onRemoveComment={(key, idx) => removeDimensionComment(setStrongOptions, key, idx)}
                                                    onEditComment={(key, idx, text) => editDimensionComment(setStrongOptions, key, idx, text)}
                                                    onReorderOption={(from, to) => reorderDimensionOption(setStrongOptions, from, to)}
                                                    onSelectDimension={activateCompetenceTab}
                                                    onOpenCardChange={setStrongOpenCard}
                                                />
                                                <RseDimensionSection
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
                                                    onAddOption={key => addDimensionOption(setDevelopOptions, key)}
                                                    onRemoveOption={removeDevelopOption}
                                                    onAddComment={(key, text) => addDimensionComment(setDevelopOptions, key, text)}
                                                    onRemoveComment={(key, idx) => removeDimensionComment(setDevelopOptions, key, idx)}
                                                    onEditComment={(key, idx, text) => editDimensionComment(setDevelopOptions, key, idx, text)}
                                                    onReorderOption={(from, to) => reorderDimensionOption(setDevelopOptions, from, to)}
                                                    onSelectDimension={activateCompetenceTab}
                                                    onOpenCardChange={setDevelopOpenCard}
                                                />
                                            </Box>
                                          </>
                                        ) : (
                                            <Alert severity="info" sx={{ borderRadius: '10px' }}>
                                                {getString('fillAllCompetencesFirst')}
                                            </Alert>
                                        )
                                    )}

                                    {/* Development plan — the third analysis tab. The
                                        plan now belongs to the EMPLOYEE, not this review
                                        record, so the section only needs the employee id;
                                        editability, competence options and persistence
                                        all live inside the shared MissionsPanel. */}
                                    {analysisTab === 2 && employeeId != null && (
                                        <DevelopmentPlanSection
                                            employeeId={employeeId}
                                            getString={getString}
                                        />
                                    )}
                                </Box>
                            </Box>
                        )}
                        </Box>

                        {/* The other two sections carry their own mb:3; the
                            dimension panel does not, so the gap below it lives
                            on the wrapper (matters when it is not last). */}
                        <Box sx={{ mb: 3, order: sectionOrder.indexOf(EvaluationSection.Competences) }}>
                        {/* Dimension tabs */}
                        {visibleEvals.length > 0 && (
                            <DimensionPanel
                                visibleEvals={visibleEvals}
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
                                unlinkFact={unlinkFact}
                                unlinkImprovement={unlinkImprovement}
                            />
                        )}
                        </Box>
                        </Box>
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

            {/* Mounted only while open. A persistent drawer left mounted keeps its
                paper parked off-screen at translateX(100%), which is what put a
                horizontal scrollbar on the page and made the header slide about. */}
            {unlinkedFactsOpen && !presentationMode && (
            <UnlinkedFactsDrawer
                open
                onClose={() => setUnlinkedFactsOpen(false)}
                getString={getString}
                facts={unlinkedFacts}
                factTypes={factTypes}
                isEditable={showEditing}
                onCreate={createPoolFact}
                onEdit={editPoolFact}
                onChangeType={changePoolFactType}
                onDelete={requestDeleteFromPool}
                setDraggedItem={setDraggedItem}
                competences={drawerCompetences}
                onFileInto={linkFromPool}
            />
            )}

            {/* Deleting a line is final — it is NOT the same as sending it back to
                the unfiled pool — so both places it can be deleted from route
                through the shared confirm dialog. */}
            <ConfirmDeleteDialog
                open={pendingFactDelete != null}
                title={getString('deleteFactTitle')}
                message={getString('areYouSureDeleteFact')}
                itemLabel={pendingFactDelete?.text}
                onConfirm={confirmFactDelete}
                onClose={() => setPendingFactDelete(null)}
            />

            {/* TEMPO album PDF viewer — image in a wide dialog (the seed of the
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

            {/* The album finished but the popup blocker refused the automatic tab
                (the build outlived the click gesture). One more click opens it —
                no rebuild, the document is already in memory. */}
            <Snackbar open={!!readyHtmlUrl} onClose={dismissReadyHtml}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
                <Alert
                    severity="info"
                    onClose={dismissReadyHtml}
                    sx={{ width: '100%' }}
                    action={
                        <Button color="inherit" size="small" onClick={openReadyHtml}>
                            {getString('open')}
                        </Button>
                    }
                >
                    {getString('tempoAlbumReady')}
                </Alert>
            </Snackbar>

            {/* The four confirmation dialogs (move / flip / develop-removal / reconcile) */}
            <EvaluationConfirmDialogs
                getString={getString}
                pendingMove={pendingMove}
                linkFromPoolById={linkFromPool}
                setPendingMove={setPendingMove}
                moveFact={moveFact}
                moveImprovement={moveImprovement}
                setActiveTab={setActiveTab}
                pendingFlip={pendingFlip}
                setPendingFlip={setPendingFlip}
                confirmFlip={confirmFlip}
                pendingSummaryReconcile={pendingSummaryReconcile}
                setPendingSummaryReconcile={setPendingSummaryReconcile}
                confirmSummaryReconcile={confirmSummaryReconcile}
            />
        </AppShell>
    );
}

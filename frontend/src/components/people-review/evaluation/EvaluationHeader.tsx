import { type Dispatch, type SetStateAction } from 'react';
import {
    Autocomplete,
    Badge,
    Box,
    Button,
    Chip,
    CircularProgress,
    IconButton,
    Stack,
    Switch,
    TextField,
    Tooltip,
    Typography,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import LockIcon from '@mui/icons-material/Lock';
import ReplayIcon from '@mui/icons-material/Replay';
import RefreshIcon from '@mui/icons-material/Refresh';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import VisibilityIcon from '@mui/icons-material/Visibility';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import NoteAddIcon from '@mui/icons-material/NoteAdd';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import ArticleOutlinedIcon from '@mui/icons-material/ArticleOutlined';
import type { GetStringFn } from '../../../types/getStringFn';
import { useTheme } from '../../theme/useTheme';
import type { ReviewSessionEmployee, ReviewSessionEmployeeList } from '../peopleReviewApi';
import { RSE_STATUS_HEX, rseStatusLabel } from '../rseStatus';
import type { AutosaveStatus } from './useEvaluationAutosave';
import EmployeeAvatar from '../../ui/EmployeeAvatar';
import { OversightManagerPicker } from '../OversightManagerPicker';
import { ScopeSettings } from '../ScopeSettings';

interface Props {
    getString: GetStringFn;
    rseDetail: ReviewSessionEmployee;
    employeeId: number | undefined;
    showEditing: boolean;
    onSuccess: (message: string) => void;
    onError: (message: string) => void;
    readOnlyHint: string | null;
    // Prev/next employee navigation.
    prevId: number | null;
    nextId: number | null;
    goToEmployee: (employeeId: number) => void;
    siblings: ReviewSessionEmployeeList[];
    eid: number;
    currentIdx: number;
    // TEMPO album.
    onOpenTempoPdf: () => void;
    onOpenTempoHtml: () => void;
    // Supervisor manual refresh.
    viewOnly: boolean;
    onRefresh: () => void;
    refreshing: boolean;
    // Reviewer notes.
    showCommentsButton: boolean;
    commentsCount: number;
    /** Hidden in presentation mode: unattached lines are not part of the review. */
    showUnlinkedFactsButton: boolean;
    unlinkedFactsCount: number;
    onOpenUnlinkedFacts: () => void;
    onOpenComments: () => void;
    // Oversight-manager picker (own record only).
    isOwnRecord: boolean;
    // Presentation toggle.
    isEditable: boolean;
    presentationMode: boolean;
    setPresentationMode: Dispatch<SetStateAction<boolean>>;
    // Section reorder toggle — a VIEW preference, so it is not gated on the
    // review being editable (a closed session can still be re-stacked).
    sectionReorderMode: boolean;
    setSectionReorderMode: Dispatch<SetStateAction<boolean>>;
    // Progress.
    allFilled: boolean;
    filledCount: number;
    totalCount: number;
    // Header actions.
    markReviewedHint: string;
    canMarkReviewed: boolean;
    onMarkReviewed: () => void;
    markReviewedPending: boolean;
    sessionStatus: string;
    onRevert: () => void;
    revertPending: boolean;
    onReopen: () => void;
    reopenPending: boolean;
    autosaveStatus: AutosaveStatus;
    onAutosaveRetry: () => void;
}

/**
 * The evaluation page header: employee identity + status chips, prev/next
 * navigation + go-to select, TEMPO album buttons, supervisor refresh, reviewer
 * notes, oversight-manager picker, presentation toggle, scope switcher, the
 * fill-progress bar, and the Mark-reviewed / Revert / autosave-status actions.
 */
export function EvaluationHeader({
    getString, rseDetail, employeeId, showEditing, onSuccess, onError, readOnlyHint,
    prevId, nextId, goToEmployee, siblings, eid, currentIdx,
    onOpenTempoPdf, onOpenTempoHtml,
    viewOnly, onRefresh, refreshing,
    showCommentsButton, commentsCount, onOpenComments,
    showUnlinkedFactsButton, unlinkedFactsCount, onOpenUnlinkedFacts,
    isOwnRecord,
    isEditable, presentationMode, setPresentationMode,
    sectionReorderMode, setSectionReorderMode,
    allFilled, filledCount, totalCount,
    markReviewedHint, canMarkReviewed, onMarkReviewed, markReviewedPending,
    sessionStatus, onRevert, revertPending, onReopen, reopenPending,
    autosaveStatus, onAutosaveRetry,
}: Props) {
    const { t } = useTheme();

    return (
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
                            onSuccess={onSuccess}
                            onError={onError}
                        />
                        <Typography variant="h5" fontWeight={700} color={t.text}>
                            {rseDetail.employee_name}
                        </Typography>
                        <Chip
                            label={rseStatusLabel(rseDetail.status, getString)}
                            size="small"
                            sx={{
                                fontWeight: 700, fontSize: 11,
                                bgcolor: `${RSE_STATUS_HEX[rseDetail.status] ?? '#888'}18`,
                                color: RSE_STATUS_HEX[rseDetail.status] ?? '#888',
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
                        <Tooltip title={prevId ? getString('previousEmployee') : getString('noPrevious')}>
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
                        <Tooltip title={nextId ? getString('nextEmployee') : getString('noNext')}>
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
                        {/* Jump straight to any in-scope employee — same list & order the
                            arrows walk, searchable by name (names only, no codes). */}
                        {siblings.length > 1 && (
                            <Autocomplete
                                size="small"
                                options={siblings}
                                value={siblings.find(s => s.employee_id === eid) ?? null}
                                onChange={(_, opt) => {
                                    if (opt && opt.employee_id !== eid) goToEmployee(opt.employee_id);
                                }}
                                getOptionLabel={(o) => o.employee_name}
                                isOptionEqualToValue={(o, v) => o.employee_id === v.employee_id}
                                renderOption={(props, o) => (
                                    <li {...props} key={o.employee_id}>{o.employee_name}</li>
                                )}
                                handleHomeEndKeys={false}
                                renderInput={(params) => (
                                    <TextField
                                        {...params}
                                        variant="outlined"
                                        placeholder={getString('goToEmployee')}
                                    />
                                )}
                                sx={{
                                    width: 220, ml: 0.5,
                                    '& .MuiOutlinedInput-root': { fontSize: 13, py: 0 },
                                }}
                            />
                        )}
                    </Box>

                    {/* TEMPO album PDF — tiny button, always available on the detail page */}
                    <Tooltip title={getString('tempoPdfTooltip')}>
                        <IconButton
                            size="small"
                            onClick={onOpenTempoPdf}
                            sx={{ color: t.textMuted }}
                        >
                            <PictureAsPdfIcon sx={{ fontSize: 18 }} />
                        </IconButton>
                    </Tooltip>
                    {/* TEMPO album as an interactive HTML page (new tab) */}
                    <Tooltip title={getString('tempoHtmlTooltip')}>
                        <IconButton
                            size="small"
                            onClick={onOpenTempoHtml}
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
                                onClick={onRefresh}
                                disabled={refreshing}
                                sx={{ color: t.textMuted }}
                            >
                                <RefreshIcon sx={{ fontSize: 18, animation: refreshing ? 'spin 0.8s linear infinite' : 'none', '@keyframes spin': { to: { transform: 'rotate(360deg)' } } }} />
                            </IconButton>
                        </Tooltip>
                    )}

                    {showCommentsButton && (
                        <Tooltip title={getString('reviewCommentsTooltip')}>
                            <Badge badgeContent={commentsCount} color="primary" overlap="circular">
                                <Button
                                    size="small"
                                    variant="outlined"
                                    startIcon={<ChatBubbleOutlineIcon sx={{ fontSize: 16 }} />}
                                    onClick={onOpenComments}
                                    sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 600, fontSize: 12 }}
                                >
                                    {getString('reviewComments')}
                                </Button>
                            </Badge>
                        </Tooltip>
                    )}

                    {/* Quick fact registration + the pool of lines not yet attached
                        to a competence. The badge is the pool's size, so an
                        unprocessed fact stays visible until it is filed. */}
                    {showUnlinkedFactsButton && (
                        <Tooltip title={getString('unlinkedFactsTooltip')}>
                            <Badge badgeContent={unlinkedFactsCount} color="warning" overlap="circular">
                                <Button
                                    size="small"
                                    variant="outlined"
                                    startIcon={<NoteAddIcon sx={{ fontSize: 16 }} />}
                                    onClick={onOpenUnlinkedFacts}
                                    sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 600, fontSize: 12 }}
                                >
                                    {getString('unlinkedFacts')}
                                </Button>
                            </Badge>
                        </Tooltip>
                    )}

                    {/* Oversight-manager settings (own record only) — tucked in the header */}
                    {isOwnRecord && (
                        <OversightManagerPicker
                            editable={showEditing}
                            getString={getString}
                            onSuccess={onSuccess}
                            onError={onError}
                        />
                    )}

                    {/* Section reorder — deliberately NOT gated on isEditable /
                        viewOnly: the stacking is a personal view preference, not
                        review data. Hidden only while presenting. */}
                    {!presentationMode && (
                        <Tooltip title={getString('sectionOrderModeHint')} placement="top">
                            <Stack direction="row" alignItems="center" spacing={0.25} sx={{ ml: 0.5 }}>
                                <Switch
                                    size="small"
                                    checked={sectionReorderMode}
                                    onChange={(e) => setSectionReorderMode(e.target.checked)}
                                />
                                <Typography fontSize={12} fontWeight={600} color={t.textMuted} sx={{ whiteSpace: 'nowrap' }}>
                                    {getString('sectionOrderMode')}
                                </Typography>
                            </Stack>
                        </Tooltip>
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

                    {/* People-review scope switcher — same top-right spot as on the
                        sessions list and inside the session. */}
                    <ScopeSettings sessionId={rseDetail.session_id} />
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
                                onClick={onMarkReviewed}
                                disabled={!canMarkReviewed || markReviewedPending}
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
                        onClick={onRevert}
                        disabled={revertPending}
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
                                onClick={onRevert}
                                disabled={revertPending}
                                sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 600, fontSize: 12 }}
                            >
                                {getString('revert')}
                            </Button>
                        </Tooltip>
                        <Tooltip title={getString('setDirectlyToOpen')}>
                            <Button
                                size="small" variant="outlined" startIcon={<ReplayIcon />}
                                onClick={onReopen}
                                disabled={reopenPending}
                                sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 600, fontSize: 12 }}
                            >
                                {getString('setOpen')}
                            </Button>
                        </Tooltip>
                    </>
                )}

                {/* Autosave status — replaces the old manual Save button. Every edit
                    persists on its own; this only reports progress (and offers a retry
                    if a background save failed). */}
                {isEditable && !viewOnly && (
                    autosaveStatus === 'error' ? (
                        <Tooltip title={getString('autosaveFailedHint')}>
                            <Button
                                size="small" variant="outlined" color="error" startIcon={<ErrorOutlineIcon />}
                                onClick={onAutosaveRetry}
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
    );
}

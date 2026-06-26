import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useDebouncedSave } from '../../hooks/useDebouncedSave';
import {
    Box,
    Button,
    Chip,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    Divider,
    Drawer,
    IconButton,
    MenuItem,
    Stack,
    TextField,
    Tooltip,
    Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EditIcon from '@mui/icons-material/Edit';
import CloseIcon from '@mui/icons-material/Close';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import useString from '../../hooks/useString';
import { InlineEditField } from './evaluation/InlineEditField';
import ConfirmDeleteDialog from './ConfirmDeleteDialog';
import {
    fetchSessionLevels,
    fetchProposedLevel,
    saveProposedLevel,
    setProposedLevelStatus,
    deleteProposedLevel,
    type ReviewLevelLite,
    type ReviewLevelRequirementLite,
    type ProposedLevelStatus,
} from './peopleReviewApi';
import {
    usePeopleReviewStore,
    EMPTY_PROPOSED_DRAFT,
    type ProposedDraft,
} from './peopleReviewStore';

/** Split a stored facts string ("1. one\n2. two") into an array, stripping numbering. */
function parseFacts(raw: string | null): string[] {
    if (!raw) return [];
    return raw
        .split('\n')
        .map((line) => line.replace(/^\d+\.\s*/, '').trim())
        .filter((line) => line.length > 0);
}

/** Serialize a facts array back to a numbered string for storage. */
function serializeFacts(facts: string[]): string {
    if (facts.length === 0) return '';
    return facts.map((f, i) => `${i + 1}. ${f}`).join('\n');
}

// Proposal lifecycle: each status maps to a translation key + a Chip/Button colour.
const STATUS_ORDER: ProposedLevelStatus[] = ['proposed', 'validated', 'rejected'];
// chipColor / btnColor differ because MUI Chip accepts 'default' but Button doesn't
// (Button uses 'inherit' for the neutral case).
const STATUS_META: Record<
    ProposedLevelStatus,
    { labelKey: string; chipColor: 'default' | 'success' | 'error'; btnColor: 'inherit' | 'success' | 'error' }
> = {
    proposed: { labelKey: 'proposedLevelStatusProposed', chipColor: 'default', btnColor: 'inherit' },
    validated: { labelKey: 'proposedLevelStatusValidated', chipColor: 'success', btnColor: 'success' },
    rejected: { labelKey: 'proposedLevelStatusRejected', chipColor: 'error', btnColor: 'error' },
};

// Debounce window for auto-saving edits to the DB (the store itself is in-memory only).
const AUTOSAVE_DELAY_MS = 800;

interface Props {
    open: boolean;
    onClose: () => void;
    rseId: number;
    /** The employee's current competency level — baseline for the +1 step rule and
     *  the decrease confirmation. Null when the employee has no level yet. */
    currentLevelId: number | null;
    setSnackbar: (s: { open: boolean; message: string; severity: 'success' | 'error' }) => void;
    /**
     * When false the drawer is view-only — the level select is disabled, the
     * comment inputs / edit / delete / auto-save are off, and the delete button
     * is hidden. Mirrors `showEditing` on the evaluation page (presentation mode,
     * or the employee status reviewed/closed, or the session closed).
     *
     * Note: the proposal STATUS controls intentionally ignore this flag — the
     * status can be changed at any time regardless of the employee/session state.
     */
    canEdit?: boolean;
}

export function ProposedLevelDrawer({ open, onClose, rseId, currentLevelId, setSnackbar, canEdit = true }: Props) {
    const getString = useString();
    const qc = useQueryClient();

    // Editable draft lives in the people-review store, keyed by rseId, so closing
    // and reopening the drawer (or navigating away) keeps in-progress edits.
    const proposedDraft = usePeopleReviewStore((s) => s.proposedDrafts[rseId]);
    const hydrateProposedDraft = usePeopleReviewStore((s) => s.hydrateProposedDraft);
    const updateProposedDraft = usePeopleReviewStore((s) => s.updateProposedDraft);
    const clearProposedDraft = usePeopleReviewStore((s) => s.clearProposedDraft);
    const { levelId, answers, drafts } = proposedDraft ?? EMPTY_PROPOSED_DRAFT;

    // Field setters with the `useState` dispatch signature so the handlers below
    // keep working unchanged — each writes back into the store draft.
    function makeSetter<K extends keyof ProposedDraft>(key: K): Dispatch<SetStateAction<ProposedDraft[K]>> {
        return (action) =>
            updateProposedDraft(rseId, (d) => ({
                ...d,
                [key]: typeof action === 'function'
                    ? (action as (prev: ProposedDraft[K]) => ProposedDraft[K])(d[key])
                    : action,
            }));
    }
    const setLevelId = makeSetter('levelId');
    const setAnswers = makeSetter('answers');
    const setDrafts = makeSetter('drafts');

    // Which comment row (requirement id + index) is being edited inline; null when none.
    const [editing, setEditing] = useState<{ reqId: number; index: number } | null>(null);
    const [confirmDelete, setConfirmDelete] = useState(false);
    // A level switch awaiting confirmation: it would discard registered answers
    // (losesData) and/or proposes a level below the current one (isDecrement).
    const [pendingLevel, setPendingLevel] = useState<
        { value: number; losesData: boolean; isDecrement: boolean } | null
    >(null);
    // Which requirement "tab" (by index) is shown — picked via the chip row below,
    // so only one requirement's facts + input occupy the screen at a time.
    const [activeReqIndex, setActiveReqIndex] = useState(0);

    // The session's FROZEN level set for this employee review (falls back to live
    // active levels for pre-freeze sessions). Frozen rows carry live ids, so the
    // answer keying / level_id save below is unchanged.
    const { data: levels = [] } = useQuery({
        queryKey: ['session_levels', rseId],
        queryFn: () => fetchSessionLevels(rseId),
        staleTime: 5 * 60_000,
        enabled: open && !!rseId,
    });

    const { data: proposed, isFetching: proposedFetching } = useQuery({
        queryKey: ['proposed_level', rseId],
        queryFn: () => fetchProposedLevel(rseId),
        enabled: open && !!rseId,
        staleTime: 30_000,
    });

    // Levels selectable as a target exclude the base level (sort_order 0).
    const selectableLevels = useMemo(
        () => levels.filter((l) => l.sort_order > 0).sort((a, b) => a.sort_order - b.sort_order),
        [levels],
    );

    // Step rule: the proposed level may be at most one RANK above the employee's
    // current level (no +2 jumps); decreases are unlimited but need confirmation.
    // Rank = position in the sort_order-ordered level list, so the +1 rule holds
    // even when sort_order values have gaps.
    const sortedLevels = useMemo(
        () => [...levels].sort((a, b) => a.sort_order - b.sort_order),
        [levels],
    );
    const rankOf = (id: number | null | undefined) =>
        id == null ? -1 : sortedLevels.findIndex((l) => l.id === id);
    const currentRankRaw = rankOf(currentLevelId);
    // No current level (or it isn't in the active list) → baseline is the base (rank 0).
    const currentRank = currentRankRaw < 0 ? 0 : currentRankRaw;
    const maxRank = currentRank + 1;

    // Hydrate the draft from any saved registration once the query has settled,
    // but only if no draft exists yet — so reopening preserves in-progress edits.
    useEffect(() => {
        if (!open || proposedFetching || proposed === undefined || proposedDraft) return;
        const map: Record<number, string[]> = {};
        if (proposed) {
            for (const a of proposed.answers) map[a.requirement_id] = parseFacts(a.facts);
        }
        hydrateProposedDraft(rseId, {
            levelId: proposed ? proposed.level_id : '',
            answers: map,
            drafts: {},
        });
    }, [open, proposed, proposedFetching, proposedDraft, rseId, hydrateProposedDraft]);

    const selectedLevel: ReviewLevelLite | undefined = levels.find((l) => l.id === levelId);
    const requirements: ReviewLevelRequirementLite[] = useMemo(
        () =>
            (selectedLevel?.requirements ?? [])
                .filter((r) => r.is_active)
                .sort((a, b) => a.sort_order - b.sort_order),
        [selectedLevel],
    );

    const filledCount = requirements.filter((r) => (answers[r.id]?.length ?? 0) > 0).length;

    const saveMut = useMutation({
        mutationFn: () =>
            saveProposedLevel(rseId, {
                level_id: Number(levelId),
                answers: requirements
                    .filter((r) => (answers[r.id]?.length ?? 0) > 0)
                    .map((r) => ({ requirement_id: r.id, facts: serializeFacts(answers[r.id]) })),
            }),
        // Do NOT clear the draft here. Under debounced auto-save clearing it would
        // re-run hydration and reset the inputs mid-edit. The draft stays the
        // source of truth while open; the refetch only refreshes the server record
        // (id / status) without touching the draft (it is still truthy).
        onSuccess: () => qc.invalidateQueries({ queryKey: ['proposed_level', rseId] }),
        onError: (err: Error) => setSnackbar({ open: true, message: err.message, severity: 'error' }),
    });

    // Debounced + serialized auto-save: persist edits to the DB after a short idle,
    // so there is no Save button. Triggered explicitly from the edit handlers (not a
    // state-watching effect), so hydration never saves. The hook guarantees only one
    // save is in flight at a time — rapid "add" presses no longer fire overlapping
    // writes to the same row (the source of the lock-contention freeze) — and clears
    // its pending timer on unmount. The save reads the latest state each render.
    const { schedule: scheduleSave, flush: flushSave, cancel: cancelSave } = useDebouncedSave(async () => {
        if (!canEdit || levelId === '') return;
        try {
            await saveMut.mutateAsync();
        } catch {
            /* surfaced via saveMut.onError; the edit stays dirty and retries later */
        }
    }, AUTOSAVE_DELAY_MS);

    // Commit a level switch (after any required confirmation).
    const applyLevelChange = (value: number) => {
        setLevelId(value);
        setActiveReqIndex(0); // a new level has its own requirement set

        // Keep answers only for requirements that still belong to the chosen level
        // (when re-picking the same level the saved answers are preserved).
        if (proposed && proposed.level_id === value) {
            const map: Record<number, string[]> = {};
            for (const a of proposed.answers) map[a.requirement_id] = parseFacts(a.facts);
            setAnswers(map);
        } else {
            setAnswers({});
        }
        setDrafts({});
        scheduleSave();
    };

    // Gate the switch: confirm when it would discard registered answers, or when
    // the target is below the employee's current level (a decrease). Otherwise the
    // switch is applied immediately. On confirm-needed we touch NO state, so the
    // select snaps back to the current value if the user cancels.
    const handleLevelChange = (value: number) => {
        if (value === levelId) return;
        const losesData = filledCount > 0 && !(proposed && proposed.level_id === value);
        const targetRank = rankOf(value);
        const isDecrement = currentRankRaw >= 0 && targetRank >= 0 && targetRank < currentRank;
        if (losesData || isDecrement) {
            setPendingLevel({ value, losesData, isDecrement });
            return;
        }
        applyLevelChange(value);
    };

    const addComment = (reqId: number) => {
        const text = (drafts[reqId] ?? '').trim();
        if (!text) return;
        setAnswers((prev) => ({ ...prev, [reqId]: [...(prev[reqId] ?? []), text] }));
        setDrafts((prev) => ({ ...prev, [reqId]: '' }));
        scheduleSave();
    };

    const removeComment = (reqId: number, idx: number) => {
        setAnswers((prev) => ({
            ...prev,
            [reqId]: (prev[reqId] ?? []).filter((_, i) => i !== idx),
        }));
        scheduleSave();
    };

    // Edit an existing comment in place (text already trimmed by the inline editor).
    const editComment = (reqId: number, idx: number, text: string) => {
        setAnswers((prev) => ({
            ...prev,
            [reqId]: (prev[reqId] ?? []).map((c, i) => (i === idx ? text.trim() : c)),
        }));
        scheduleSave();
    };

    // Flush any pending edit immediately when the drawer closes (no-op if nothing dirty).
    const handleClose = () => {
        void flushSave();
        onClose();
    };

    const statusMut = useMutation({
        mutationFn: (status: ProposedLevelStatus) => setProposedLevelStatus(rseId, status),
        onSuccess: async (res) => {
            await qc.invalidateQueries({ queryKey: ['proposed_level', rseId] });
            setSnackbar({ open: true, message: res.detail, severity: 'success' });
        },
        onError: (err: Error) => setSnackbar({ open: true, message: err.message, severity: 'error' }),
    });

    const deleteMut = useMutation({
        mutationFn: () => deleteProposedLevel(rseId),
        onSuccess: (res) => {
            // Drop any queued autosave so it can't re-create the row we just deleted.
            cancelSave();
            // Set the cache to null first so hydration repopulates the (now empty)
            // draft instead of racing against the stale cached record.
            qc.setQueryData(['proposed_level', rseId], null);
            qc.invalidateQueries({ queryKey: ['proposed_level', rseId] });
            clearProposedDraft(rseId);
            setConfirmDelete(false);
            setSnackbar({ open: true, message: res.detail, severity: 'success' });
        },
        onError: (err: Error) => {
            setConfirmDelete(false);
            setSnackbar({ open: true, message: err.message, severity: 'error' });
        },
    });

    return (
        <>
            <Drawer anchor="right" open={open} onClose={handleClose} slotProps={{ paper: { sx: { width: { xs: '100%', sm: 560 } } } }}>
                <Box sx={{ p: 2.5, display: 'flex', flexDirection: 'column', height: '100%' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <Typography variant="h6" fontWeight={700} sx={{ flex: 1 }}>
                            {getString('proposedLevel')}
                        </Typography>
                        {canEdit && (
                            <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mr: 1 }}>
                                {saveMut.isPending ? (
                                    <>
                                        <CircularProgress size={14} />
                                        <Typography fontSize={12} color="text.secondary">{getString('saving')}</Typography>
                                    </>
                                ) : saveMut.isSuccess ? (
                                    <>
                                        <CheckCircleIcon color="success" sx={{ fontSize: 15 }} />
                                        <Typography fontSize={12} color="text.secondary">{getString('allChangesSaved')}</Typography>
                                    </>
                                ) : null}
                            </Stack>
                        )}
                        <IconButton onClick={handleClose} size="small">
                            <CloseIcon />
                        </IconButton>
                    </Box>

                    <TextField
                        select
                        variant="outlined"
                        label={getString('selectLevelToPropose')}
                        value={levelId === '' ? '' : String(levelId)}
                        onChange={(e) => handleLevelChange(Number(e.target.value))}
                        disabled={!canEdit}
                        helperText={getString('proposedLevelStepHint')}
                        fullWidth
                        sx={{ mb: 2 }}
                    >
                        {selectableLevels.map((lvl) => (
                            <MenuItem
                                key={lvl.id}
                                value={String(lvl.id)}
                                disabled={rankOf(lvl.id) > maxRank}
                            >
                                {getString(lvl.name_key)}
                            </MenuItem>
                        ))}
                    </TextField>

                    {/* Proposal status — chip + switch buttons. Always enabled (independent
                        of canEdit), shown once the proposal row exists on the server. */}
                    {proposed?.id != null && (
                        <Box sx={{ mb: 2 }}>
                            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                                <Typography fontSize={13} fontWeight={700}>{getString('status')}</Typography>
                                <Chip
                                    size="small"
                                    color={STATUS_META[proposed.status].chipColor}
                                    label={getString(STATUS_META[proposed.status].labelKey)}
                                    sx={{ fontWeight: 700 }}
                                />
                            </Stack>
                            <Stack direction="row" spacing={1}>
                                {STATUS_ORDER.map((s) => (
                                    <Button
                                        key={s}
                                        size="small"
                                        variant={proposed.status === s ? 'contained' : 'outlined'}
                                        color={STATUS_META[s].btnColor}
                                        onClick={() => statusMut.mutate(s)}
                                        disabled={proposed.status === s || statusMut.isPending}
                                        sx={{ textTransform: 'none', fontWeight: 600, fontSize: 12, borderRadius: '8px' }}
                                    >
                                        {getString(STATUS_META[s].labelKey)}
                                    </Button>
                                ))}
                            </Stack>
                        </Box>
                    )}

                    {levelId === '' && (
                        <Typography color="text.secondary" variant="body2">
                            {getString('noLevelSelected')}
                        </Typography>
                    )}

                    {levelId !== '' && requirements.length > 0 && (() => {
                        // Single-requirement view: the chip row below picks which one is
                        // shown, so its facts list + a roomy input get the whole panel.
                        const safeIdx = Math.min(activeReqIndex, requirements.length - 1);
                        const activeReq = requirements[safeIdx];
                        const comments = answers[activeReq.id] ?? [];
                        return (
                        <>
                            {/* Mini progress chart — one bar per requirement, filled when answered. */}
                            <Box sx={{ mb: 1 }}>
                                <Typography fontSize={12} fontWeight={600} color="text.secondary" sx={{ mb: 0.5 }}>
                                    {getString('proposedLevelProgress', { count: filledCount, total: requirements.length })}
                                </Typography>
                                <Stack direction="row" spacing={0.5}>
                                    {requirements.map((r) => {
                                        const filled = (answers[r.id]?.length ?? 0) > 0;
                                        return (
                                            <Box
                                                key={r.id}
                                                sx={{
                                                    flex: 1,
                                                    height: 8,
                                                    borderRadius: 4,
                                                    bgcolor: filled ? 'success.main' : 'action.disabledBackground',
                                                    transition: 'background-color 0.3s ease',
                                                }}
                                            />
                                        );
                                    })}
                                </Stack>
                            </Box>

                            {/* Second row — one selectable chip per requirement (the tabs),
                                in equal-width columns aligned 1:1 under the bars above. Click
                                selects it below; the active chip is highlighted, the rest
                                neutral (filled ones tinted). Tooltip shows the requirement text. */}
                            <Stack direction="row" spacing={0.5} sx={{ mb: 1.5 }}>
                                {requirements.map((r, idx) => {
                                    const filled = (answers[r.id]?.length ?? 0) > 0;
                                    const isActive = idx === safeIdx;
                                    return (
                                        <Tooltip key={r.id} title={getString(r.text_key)}>
                                            <Chip
                                                label={idx + 1}
                                                size="small"
                                                color={isActive ? 'primary' : 'default'}
                                                variant={isActive ? 'filled' : 'outlined'}
                                                onClick={() => setActiveReqIndex(idx)}
                                                sx={{
                                                    flex: 1,
                                                    minWidth: 0,
                                                    fontWeight: 700,
                                                    cursor: 'pointer',
                                                    ...(filled && !isActive && { color: 'success.main', borderColor: 'success.main' }),
                                                }}
                                            />
                                        </Tooltip>
                                    );
                                })}
                            </Stack>
                            <Divider sx={{ mb: 1.5 }} />

                            {/* Active requirement: title, its facts, and a roomy input. */}
                            <Stack direction="row" spacing={1} sx={{ mb: 1.5 }}>
                                <Chip label={safeIdx + 1} size="small" color="primary" />
                                <Typography fontSize={13} fontWeight={600}>{getString(activeReq.text_key)}</Typography>
                            </Stack>

                            <Box sx={{ flex: 1, overflowY: 'auto', pr: 0.5, mb: 1.5 }}>
                                {comments.length === 0 && (
                                    <Typography fontSize={12} color="text.secondary" sx={{ fontStyle: 'italic' }}>
                                        {getString('levelNoCommentsYet')}
                                    </Typography>
                                )}
                                {comments.map((comment, ci) => (
                                    <Stack
                                        key={ci}
                                        direction="row"
                                        alignItems={editing?.reqId === activeReq.id && editing.index === ci ? 'flex-start' : 'center'}
                                        spacing={0.5}
                                        sx={{ mb: 0.5 }}
                                    >
                                        {canEdit && editing?.reqId === activeReq.id && editing.index === ci ? (
                                            <>
                                                <Typography fontSize={12} sx={{ pt: '8px' }}>{ci + 1}.</Typography>
                                                <InlineEditField
                                                    initialValue={comment}
                                                    getString={getString}
                                                    onSave={(text) => { editComment(activeReq.id, ci, text); setEditing(null); }}
                                                    onCancel={() => setEditing(null)}
                                                />
                                            </>
                                        ) : (
                                            <>
                                                <Typography fontSize={13} sx={{ flex: 1, wordBreak: 'break-word' }}>
                                                    {ci + 1}. {comment}
                                                </Typography>
                                                {canEdit && (
                                                    <>
                                                        <Tooltip title={getString('edit')}>
                                                            <IconButton size="small" onClick={() => setEditing({ reqId: activeReq.id, index: ci })}>
                                                                <EditIcon sx={{ fontSize: 15 }} />
                                                            </IconButton>
                                                        </Tooltip>
                                                        <Tooltip title={getString('levelDeleteComment')}>
                                                            <IconButton size="small" onClick={() => removeComment(activeReq.id, ci)}>
                                                                <DeleteIcon sx={{ fontSize: 15 }} />
                                                            </IconButton>
                                                        </Tooltip>
                                                    </>
                                                )}
                                            </>
                                        )}
                                    </Stack>
                                ))}
                            </Box>

                            {canEdit && (
                                <Stack direction="row" spacing={1} alignItems="flex-start">
                                    <TextField
                                        size="small"
                                        fullWidth
                                        multiline
                                        minRows={3}
                                        maxRows={10}
                                        variant="outlined"
                                        placeholder={getString('levelTypeComment')}
                                        value={drafts[activeReq.id] ?? ''}
                                        onChange={(e) =>
                                            setDrafts((prev) => ({ ...prev, [activeReq.id]: e.target.value }))
                                        }
                                        onKeyDown={(e) => {
                                            // Multiline now: Enter inserts a newline; Ctrl/Cmd+Enter adds.
                                            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                                                e.preventDefault();
                                                addComment(activeReq.id);
                                            }
                                        }}
                                    />
                                    <Button
                                        size="small"
                                        variant="outlined"
                                        startIcon={<AddIcon />}
                                        onClick={() => addComment(activeReq.id)}
                                        disabled={!(drafts[activeReq.id] ?? '').trim()}
                                        sx={{ mt: 0.5, whiteSpace: 'nowrap' }}
                                    >
                                        {getString('levelAddComment')}
                                    </Button>
                                </Stack>
                            )}
                        </>
                        );
                    })()}

                    <Divider sx={{ my: 1.5 }} />
                    <Stack direction="row" spacing={1} justifyContent="space-between" alignItems="center">
                        <Box>
                            {canEdit && proposed?.id != null && (
                                <Button
                                    color="error"
                                    startIcon={<DeleteOutlineIcon />}
                                    onClick={() => setConfirmDelete(true)}
                                    disabled={deleteMut.isPending}
                                    sx={{ textTransform: 'none', fontWeight: 600 }}
                                >
                                    {getString('deleteProposedLevel')}
                                </Button>
                            )}
                        </Box>
                        <Button onClick={handleClose}>{getString('close')}</Button>
                    </Stack>
                </Box>
            </Drawer>

            <ConfirmDeleteDialog
                open={confirmDelete}
                message={getString('confirmDeleteProposedLevelMessage')}
                isDeleting={deleteMut.isPending}
                getString={getString}
                onConfirm={() => deleteMut.mutate()}
                onClose={() => setConfirmDelete(false)}
            />

            {/* Confirm a level switch that loses registered data and/or decreases the level. */}
            <Dialog open={pendingLevel !== null} onClose={() => setPendingLevel(null)} maxWidth="xs" fullWidth>
                <DialogTitle>{getString('confirmProposedLevelChangeTitle')}</DialogTitle>
                <DialogContent>
                    {pendingLevel?.isDecrement && (
                        <DialogContentText>{getString('confirmProposedLevelDecrement')}</DialogContentText>
                    )}
                    {pendingLevel?.losesData && (
                        <DialogContentText sx={{ mt: pendingLevel?.isDecrement ? 1 : 0 }}>
                            {getString('confirmProposedLevelDataLoss')}
                        </DialogContentText>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setPendingLevel(null)}>{getString('cancel')}</Button>
                    <Button
                        variant="contained"
                        color="warning"
                        onClick={() => {
                            if (pendingLevel) applyLevelChange(pendingLevel.value);
                            setPendingLevel(null);
                        }}
                    >
                        {getString('continue')}
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
}

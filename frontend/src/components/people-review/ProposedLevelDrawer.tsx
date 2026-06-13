import { useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Box,
    Button,
    Chip,
    CircularProgress,
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
    fetchReviewLevels,
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

export function ProposedLevelDrawer({ open, onClose, rseId, setSnackbar, canEdit = true }: Props) {
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

    // Auto-save bookkeeping: `dirtyRef` flags user-made changes (so hydration does
    // not trigger a save); `timerRef` holds the pending debounce timer.
    const dirtyRef = useRef(false);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const { data: levels = [] } = useQuery({
        queryKey: ['review_levels', 'active'],
        queryFn: () => fetchReviewLevels(true),
        staleTime: 5 * 60_000,
        enabled: open,
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

    const handleLevelChange = (value: number) => {
        dirtyRef.current = true;
        setLevelId(value);
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
    };

    const addComment = (reqId: number) => {
        const text = (drafts[reqId] ?? '').trim();
        if (!text) return;
        dirtyRef.current = true;
        setAnswers((prev) => ({ ...prev, [reqId]: [...(prev[reqId] ?? []), text] }));
        setDrafts((prev) => ({ ...prev, [reqId]: '' }));
    };

    const removeComment = (reqId: number, idx: number) => {
        dirtyRef.current = true;
        setAnswers((prev) => ({
            ...prev,
            [reqId]: (prev[reqId] ?? []).filter((_, i) => i !== idx),
        }));
    };

    // Edit an existing comment in place (text already trimmed by the inline editor).
    const editComment = (reqId: number, idx: number, text: string) => {
        dirtyRef.current = true;
        setAnswers((prev) => ({
            ...prev,
            [reqId]: (prev[reqId] ?? []).map((c, i) => (i === idx ? text.trim() : c)),
        }));
    };

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

    // Debounced auto-save: persist edits to the DB after a short idle, so there is
    // no Save button. Skipped while read-only, with no level chosen, or right after
    // hydration (dirtyRef is false until the user changes something).
    useEffect(() => {
        if (!open || !canEdit || levelId === '' || !dirtyRef.current) return;
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
            dirtyRef.current = false;
            saveMut.mutate();
        }, AUTOSAVE_DELAY_MS);
        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
        };
        // saveMut.mutate is stable; re-running on every render would reset the timer.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, canEdit, levelId, answers]);

    // Flush any pending edit immediately when the drawer closes.
    const handleClose = () => {
        if (timerRef.current) clearTimeout(timerRef.current);
        if (open && canEdit && levelId !== '' && dirtyRef.current) {
            dirtyRef.current = false;
            saveMut.mutate();
        }
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
            dirtyRef.current = false;
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
                        fullWidth
                        sx={{ mb: 2 }}
                    >
                        {selectableLevels.map((lvl) => (
                            <MenuItem key={lvl.id} value={String(lvl.id)}>
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

                    {levelId !== '' && requirements.length > 0 && (
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
                            <Divider sx={{ mb: 1.5 }} />

                            <Typography fontSize={13} fontWeight={700} sx={{ mb: 1 }}>
                                {getString('requirementsToAchieve')}
                            </Typography>

                            <Box sx={{ flex: 1, overflowY: 'auto', pr: 0.5 }}>
                                {requirements.map((req, idx) => {
                                    const comments = answers[req.id] ?? [];
                                    return (
                                        <Box
                                            key={req.id}
                                            sx={{
                                                mb: 1.5,
                                                p: 1.5,
                                                border: '1px solid',
                                                borderColor: 'divider',
                                                borderRadius: 1,
                                            }}
                                        >
                                            <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
                                                <Chip label={idx + 1} size="small" />
                                                <Typography fontSize={13}>{getString(req.text_key)}</Typography>
                                            </Stack>

                                            {comments.map((comment, ci) => (
                                                <Stack
                                                    key={ci}
                                                    direction="row"
                                                    alignItems={editing?.reqId === req.id && editing.index === ci ? 'flex-start' : 'center'}
                                                    spacing={0.5}
                                                    sx={{ mb: 0.5 }}
                                                >
                                                    {canEdit && editing?.reqId === req.id && editing.index === ci ? (
                                                        <>
                                                            <Typography fontSize={12} sx={{ pt: '8px' }}>{ci + 1}.</Typography>
                                                            <InlineEditField
                                                                initialValue={comment}
                                                                getString={getString}
                                                                onSave={(text) => { editComment(req.id, ci, text); setEditing(null); }}
                                                                onCancel={() => setEditing(null)}
                                                            />
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Typography fontSize={12} sx={{ flex: 1 }}>
                                                                {ci + 1}. {comment}
                                                            </Typography>
                                                            {canEdit && (
                                                                <>
                                                                    <Tooltip title={getString('edit')}>
                                                                        <IconButton size="small" onClick={() => setEditing({ reqId: req.id, index: ci })}>
                                                                            <EditIcon sx={{ fontSize: 15 }} />
                                                                        </IconButton>
                                                                    </Tooltip>
                                                                    <Tooltip title={getString('levelDeleteComment')}>
                                                                        <IconButton size="small" onClick={() => removeComment(req.id, ci)}>
                                                                            <DeleteIcon sx={{ fontSize: 15 }} />
                                                                        </IconButton>
                                                                    </Tooltip>
                                                                </>
                                                            )}
                                                        </>
                                                    )}
                                                </Stack>
                                            ))}

                                            {canEdit && (
                                                <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
                                                    <TextField
                                                        size="small"
                                                        fullWidth
                                                        variant="outlined"
                                                        placeholder={getString('levelTypeComment')}
                                                        value={drafts[req.id] ?? ''}
                                                        onChange={(e) =>
                                                            setDrafts((prev) => ({ ...prev, [req.id]: e.target.value }))
                                                        }
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') {
                                                                e.preventDefault();
                                                                addComment(req.id);
                                                            }
                                                        }}
                                                    />
                                                    <Button
                                                        size="small"
                                                        variant="outlined"
                                                        startIcon={<AddIcon />}
                                                        onClick={() => addComment(req.id)}
                                                        disabled={!(drafts[req.id] ?? '').trim()}
                                                    >
                                                        {getString('levelAddComment')}
                                                    </Button>
                                                </Stack>
                                            )}
                                        </Box>
                                    );
                                })}
                            </Box>
                        </>
                    )}

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
        </>
    );
}

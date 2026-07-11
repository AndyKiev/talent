import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Box,
    Button,
    Chip,
    Divider,
    Drawer,
    IconButton,
    MenuItem,
    Select,
    Stack,
    TextField,
    Tooltip,
    Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import LockIcon from '@mui/icons-material/Lock';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import PublicIcon from '@mui/icons-material/Public';
import SupervisorAccountOutlinedIcon from '@mui/icons-material/SupervisorAccountOutlined';
import dayjs from 'dayjs';
import useString from '../../hooks/useString';
import EmployeeAvatar from '../ui/EmployeeAvatar';
import ConfirmDeleteDialog from './ConfirmDeleteDialog';
import {
    fetchReviewComments,
    createReviewComment,
    updateReviewComment,
    deleteReviewComment,
    type ReviewComment,
    type CommentVisibility,
    type CommentAuthorRole,
} from './peopleReviewApi';

interface Props {
    open: boolean;
    onClose: () => void;
    rseId: number;
    /** True only for an active oversight/supervision reviewer, on someone else's
     *  still-open review, outside presentation mode. Gates every write affordance;
     *  the backend enforces the same rule authoritatively. */
    canComment: boolean;
    /** The role a NEW note would be authored under (the user's active mode). Drives
     *  the composer's available visibility scopes. Null only when canComment is false. */
    myAuthorRole: CommentAuthorRole | null;
    myEmployeeId: number | null;
    setSnackbar: (s: { open: boolean; message: string; severity: 'success' | 'error' }) => void;
}

/** Visibility scopes a note may take, per the role it was authored under.
 *  Three tiers each: private -> role-specific middle scope -> public (everyone).
 *  Full rules matrix: .claude/skills/review-comments/SKILL.md */
const VIS_OPTIONS: Record<CommentAuthorRole, CommentVisibility[]> = {
    oversight: ['private', 'to_subject', 'public'],
    supervision: ['private', 'to_oversight', 'public'],
};

const VIS_META: Record<CommentVisibility, { labelKey: string; hintKey: string }> = {
    private: { labelKey: 'reviewCommentVisibilityPrivate', hintKey: 'reviewCommentVisibilityPrivateHint' },
    to_subject: { labelKey: 'reviewCommentVisibilityToSubject', hintKey: 'reviewCommentVisibilityToSubjectHint' },
    to_oversight: { labelKey: 'reviewCommentVisibilityOversight', hintKey: 'reviewCommentVisibilityOversightHint' },
    public: { labelKey: 'reviewCommentVisibilityPublic', hintKey: 'reviewCommentVisibilityPublicHint' },
};

function VisibilityIconFor({ v }: { v: CommentVisibility }) {
    if (v === 'public') return <PublicIcon sx={{ fontSize: 13 }} />;
    if (v === 'to_subject') return <PersonOutlineIcon sx={{ fontSize: 13 }} />;
    if (v === 'to_oversight') return <SupervisorAccountOutlinedIcon sx={{ fontSize: 13 }} />;
    return <LockIcon sx={{ fontSize: 13 }} />;
}

/** DD.MM.YYYY HH:mm — the required note timestamp format. */
function formatStamp(iso: string | null): string {
    return iso ? dayjs(iso).format('DD.MM.YYYY HH:mm') : '';
}

export function ReviewCommentsDrawer({ open, onClose, rseId, canComment, myAuthorRole, myEmployeeId, setSnackbar }: Props) {
    const getString = useString();
    const qc = useQueryClient();
    const commentsQk = ['review_comments', rseId];

    // New-note composer + inline edit are transient UI only (notes persist on save).
    const [newBody, setNewBody] = useState('');
    const [newVisibility, setNewVisibility] = useState<CommentVisibility>('private');
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editBody, setEditBody] = useState('');
    const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

    const { data: comments = [] } = useQuery({
        queryKey: commentsQk,
        queryFn: () => fetchReviewComments(rseId),
        enabled: open && !!rseId,
        staleTime: 15_000,
    });

    const invalidate = () => qc.invalidateQueries({ queryKey: commentsQk });

    const createMut = useMutation({
        mutationFn: () => createReviewComment(rseId, { body: newBody.trim(), visibility: newVisibility }),
        onSuccess: (res) => {
            invalidate();
            setNewBody('');
            setNewVisibility('private');
            setSnackbar({ open: true, message: res.detail, severity: 'success' });
        },
        onError: (err: Error) => setSnackbar({ open: true, message: err.message, severity: 'error' }),
    });

    const updateMut = useMutation({
        mutationFn: (vars: { commentId: number; body?: string; visibility?: CommentVisibility }) =>
            updateReviewComment(rseId, vars.commentId, { body: vars.body, visibility: vars.visibility }),
        onSuccess: (res) => {
            invalidate();
            setEditingId(null);
            setSnackbar({ open: true, message: res.detail, severity: 'success' });
        },
        onError: (err: Error) => setSnackbar({ open: true, message: err.message, severity: 'error' }),
    });

    const deleteMut = useMutation({
        mutationFn: (commentId: number) => deleteReviewComment(rseId, commentId),
        onSuccess: (res) => {
            invalidate();
            setConfirmDeleteId(null);
            setSnackbar({ open: true, message: res.detail, severity: 'success' });
        },
        onError: (err: Error) => {
            setConfirmDeleteId(null);
            setSnackbar({ open: true, message: err.message, severity: 'error' });
        },
    });

    const startEdit = (c: ReviewComment) => {
        setEditingId(c.id);
        setEditBody(c.body);
    };

    const visibilityChip = (v: CommentVisibility) => (
        <Chip
            size="small"
            icon={<VisibilityIconFor v={v} />}
            label={getString(VIS_META[v].labelKey)}
            variant="outlined"
            sx={{ height: 22, fontSize: 11 }}
        />
    );

    // Owner-editable scope select whose options depend on the note's author role
    // ('to_oversight' shows only for supervision-authored notes).
    const visibilitySelect = (
        value: CommentVisibility,
        role: CommentAuthorRole,
        onChange: (v: CommentVisibility) => void,
    ) => (
        <Select
            value={value}
            onChange={(e) => onChange(e.target.value as CommentVisibility)}
            size="small"
            variant="outlined"
            sx={{ fontSize: 11, height: 28, '& .MuiSelect-select': { py: 0.25, pl: 1 } }}
        >
            {VIS_OPTIONS[role].map((opt) => (
                <MenuItem key={opt} value={opt} sx={{ fontSize: 12 }}>
                    {getString(VIS_META[opt].labelKey)}
                </MenuItem>
            ))}
        </Select>
    );

    return (
        <>
            <Drawer
                anchor="right"
                open={open}
                onClose={onClose}
                slotProps={{ paper: { sx: { width: { xs: '100%', sm: 480 } } } }}
            >
                <Box sx={{ p: 2.5, display: 'flex', flexDirection: 'column', height: '100%' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <Typography variant="h6" fontWeight={700} sx={{ flex: 1 }}>
                            {getString('reviewComments')}
                        </Typography>
                        <IconButton onClick={onClose} size="small">
                            <CloseIcon />
                        </IconButton>
                    </Box>

                    {/* Notes list */}
                    <Box sx={{ flex: 1, overflowY: 'auto', pr: 0.5 }}>
                        {comments.length === 0 ? (
                            <Typography color="text.secondary" variant="body2" sx={{ mt: 1 }}>
                                {getString('reviewCommentNoneYet')}
                            </Typography>
                        ) : (
                            comments.map((c) => {
                                const isOwn = myEmployeeId != null && c.author_id === myEmployeeId;
                                const isEdited = !!c.updated_at && c.updated_at !== c.created_at;
                                return (
                                    <Box
                                        key={c.id}
                                        sx={{ mb: 1.5, p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 1.5 }}
                                    >
                                        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.75 }}>
                                            <EmployeeAvatar employeeId={c.author_id} name={c.author_name} scope="reviewComments" size={28} />
                                            <Box sx={{ minWidth: 0, flex: 1 }}>
                                                <Typography fontSize={13} fontWeight={700} noWrap>
                                                    {c.author_name}
                                                </Typography>
                                                <Typography fontSize={11} color="text.secondary">
                                                    {formatStamp(c.created_at)}
                                                    {isEdited && ` · ${getString('reviewCommentEdited')}`}
                                                </Typography>
                                            </Box>
                                            <Chip
                                                size="small"
                                                label={getString(
                                                    c.author_role === 'supervision'
                                                        ? 'reviewCommentRoleSupervision'
                                                        : 'reviewCommentRoleOversight',
                                                )}
                                                sx={{ height: 20, fontSize: 10 }}
                                            />
                                        </Stack>

                                        {editingId === c.id ? (
                                            <Stack spacing={1} sx={{ mb: 0.5 }}>
                                                <TextField
                                                    value={editBody}
                                                    onChange={(e) => setEditBody(e.target.value)}
                                                    multiline
                                                    minRows={2}
                                                    fullWidth
                                                    size="small"
                                                    variant="outlined"
                                                    autoFocus
                                                />
                                                <Stack direction="row" spacing={1} justifyContent="flex-end">
                                                    <Button size="small" onClick={() => setEditingId(null)} sx={{ textTransform: 'none' }}>
                                                        {getString('cancel')}
                                                    </Button>
                                                    <Button
                                                        size="small"
                                                        variant="contained"
                                                        disabled={!editBody.trim() || updateMut.isPending}
                                                        onClick={() => updateMut.mutate({ commentId: c.id, body: editBody.trim() })}
                                                        sx={{ textTransform: 'none' }}
                                                    >
                                                        {getString('save')}
                                                    </Button>
                                                </Stack>
                                            </Stack>
                                        ) : (
                                            <Typography fontSize={13} sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', mb: 0.75 }}>
                                                {c.body}
                                            </Typography>
                                        )}

                                        <Stack direction="row" spacing={1} alignItems="center">
                                            {/* Owner can flip the visibility scope any time the review is open. */}
                                            {isOwn && canComment
                                                ? visibilitySelect(c.visibility, c.author_role, (v) =>
                                                      updateMut.mutate({ commentId: c.id, visibility: v }),
                                                  )
                                                : visibilityChip(c.visibility)}
                                            <Box sx={{ flex: 1 }} />
                                            {isOwn && canComment && editingId !== c.id && (
                                                <>
                                                    <Tooltip title={getString('edit')}>
                                                        <IconButton size="small" onClick={() => startEdit(c)}>
                                                            <EditIcon sx={{ fontSize: 16 }} />
                                                        </IconButton>
                                                    </Tooltip>
                                                    <Tooltip title={getString('delete')}>
                                                        <IconButton size="small" onClick={() => setConfirmDeleteId(c.id)}>
                                                            <DeleteIcon sx={{ fontSize: 16 }} />
                                                        </IconButton>
                                                    </Tooltip>
                                                </>
                                            )}
                                        </Stack>
                                    </Box>
                                );
                            })
                        )}
                    </Box>

                    {/* Composer — only for an active reviewer on a still-open review. */}
                    {canComment && (
                        <>
                            <Divider sx={{ my: 1.5 }} />
                            <Stack spacing={1}>
                                <TextField
                                    value={newBody}
                                    onChange={(e) => setNewBody(e.target.value)}
                                    placeholder={getString('reviewCommentPlaceholder')}
                                    multiline
                                    minRows={2}
                                    fullWidth
                                    size="small"
                                    variant="outlined"
                                />
                                <Stack direction="row" spacing={1} alignItems="center">
                                    <Select
                                        value={newVisibility}
                                        onChange={(e) => setNewVisibility(e.target.value as CommentVisibility)}
                                        size="small"
                                        variant="outlined"
                                        sx={{ fontSize: 12, minWidth: 120 }}
                                    >
                                        {VIS_OPTIONS[myAuthorRole ?? 'oversight'].map((opt) => (
                                            <MenuItem key={opt} value={opt} sx={{ fontSize: 13 }}>
                                                {getString(VIS_META[opt].labelKey)}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                    <Tooltip title={getString(VIS_META[newVisibility].hintKey)}>
                                        <Box sx={{ color: 'text.secondary', display: 'flex' }}>
                                            <VisibilityIconFor v={newVisibility} />
                                        </Box>
                                    </Tooltip>
                                    <Box sx={{ flex: 1 }} />
                                    <Button
                                        variant="contained"
                                        size="small"
                                        startIcon={<AddIcon />}
                                        disabled={!newBody.trim() || createMut.isPending}
                                        onClick={() => createMut.mutate()}
                                        sx={{ textTransform: 'none', fontWeight: 600 }}
                                    >
                                        {getString('reviewCommentAdd')}
                                    </Button>
                                </Stack>
                            </Stack>
                        </>
                    )}
                </Box>
            </Drawer>

            <ConfirmDeleteDialog
                open={confirmDeleteId != null}
                message={getString('reviewCommentDeleteConfirm')}
                isDeleting={deleteMut.isPending}
                getString={getString}
                onConfirm={() => confirmDeleteId != null && deleteMut.mutate(confirmDeleteId)}
                onClose={() => setConfirmDeleteId(null)}
            />
        </>
    );
}

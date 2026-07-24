// src/components/employees/trainings/RecommendedTrainingsPanel.tsx
//
// THE shared recommended-trainings list. Both hosts render this same component,
// so the two views cannot drift:
//   * people review  -> the Trainings tab of the employee data tabs
//   * employee card  -> /employees/$employeeId/trainings
//
// Independent of the training module: no training_type, no eligibility, its own
// status lookup — so it keeps working with that module switched off, which is
// the whole reason these rows exist separately from `employee_trainings`.
//
// Permissions come from the SERVER (`permissions` on the list response) and are
// used for affordances only; every write is re-checked server-side. The split is
// deliberate: the employee and their oversight manager may both add, edit and
// change status, but only oversight/admin may DELETE — an employee retires a
// recommendation with the is_active toggle, which keeps the record.
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    Box,
    Button,
    Chip,
    CircularProgress,
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
import DoneIcon from '@mui/icons-material/Done';
import EditIcon from '@mui/icons-material/Edit';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import useString from '../../../hooks/useString';
import { useTheme } from '../../theme/useTheme';
import {
    createRecommendedTraining,
    deleteRecommendedTraining,
    fetchRecommendedTrainings,
    fetchRecommendedTrainingStatuses,
    updateRecommendedTraining,
    type RecommendedTraining,
} from './recommendedTrainingApi';
import {
    RECOMMENDED_TRAINING_STATUSES_QK,
    RECOMMENDED_TRAININGS_QK,
} from '../../../utils/queryKeys';
import ConfirmDeleteDialog from '../../ui/ConfirmDeleteDialog';

interface Props {
    employeeId: number;
    /** False in a read-only host (supervision view, closed review). The server
     *  still decides — this only hides controls the caller knows are pointless. */
    isEditable?: boolean;
    onError?: (message: string) => void;
}

export function RecommendedTrainingsPanel({
    employeeId,
    isEditable = true,
    onError,
}: Props) {
    const getString = useString();
    const { t } = useTheme();
    const qc = useQueryClient();

    // "Show retired ones too". Off by default because the whole point of
    // is_active is that the list stays current without losing history; it is a
    // small icon toggle rather than a filter bar, since it is rarely used.
    const [showInactive, setShowInactive] = useState(false);
    const [newText, setNewText] = useState('');
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editText, setEditText] = useState('');
    // Deleting is irreversible and is the one action an employee CANNOT undo by
    // re-toggling is_active, so it is confirmed. Holds the whole row, not just
    // the id, so the dialog can name what is about to go.
    const [pendingDelete, setPendingDelete] = useState<RecommendedTraining | null>(null);

    const { data: statuses = [] } = useQuery({
        queryKey: RECOMMENDED_TRAINING_STATUSES_QK,
        queryFn: fetchRecommendedTrainingStatuses,
        staleTime: 5 * 60_000,
    });
    const { data, isLoading } = useQuery({
        queryKey: RECOMMENDED_TRAININGS_QK(employeeId, showInactive),
        queryFn: () => fetchRecommendedTrainings(employeeId, showInactive),
        enabled: !!employeeId,
        staleTime: 30_000,
    });

    const items = data?.items ?? [];
    const canWrite = !!data?.permissions.can_write && isEditable;
    const canDelete = !!data?.permissions.can_delete && isEditable;

    // Both list variants (active-only and include-inactive) are invalidated, so
    // toggling the eye after a write never shows a stale set.
    const invalidate = () =>
        qc.invalidateQueries({ queryKey: RECOMMENDED_TRAININGS_QK(employeeId) });
    const fail = (e: unknown) => onError?.(e instanceof Error ? e.message : String(e));

    const addMut = useMutation({
        mutationFn: (description: string) =>
            createRecommendedTraining(employeeId, { description }),
        onSuccess: () => { setNewText(''); void invalidate(); },
        onError: fail,
    });
    const updateMut = useMutation({
        mutationFn: ({ id, ...body }: { id: number } & Parameters<typeof updateRecommendedTraining>[1]) =>
            updateRecommendedTraining(id, body),
        onSuccess: () => { setEditingId(null); void invalidate(); },
        onError: fail,
    });
    const deleteMut = useMutation({
        mutationFn: deleteRecommendedTraining,
        onSuccess: () => { setPendingDelete(null); void invalidate(); },
        onError: (e: unknown) => { setPendingDelete(null); fail(e); },
    });

    /** Status label by the same `<prefix><PascalKey>` convention used elsewhere,
     *  falling back to the row's own description when the key has no translation. */
    const statusLabel = (key: string, fallback: string) => {
        if (!key) return fallback;
        const pascal = key
            .split('_')
            .filter(Boolean)
            .map(p => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase())
            .join('');
        const msgKey = `recommendedTrainingStatus${pascal}`;
        const text = getString(msgKey);
        return text && text !== msgKey ? text : (fallback || key);
    };

    const submitNew = () => {
        const text = newText.trim();
        if (text) addMut.mutate(text);
    };

    const row = (item: RecommendedTraining) => {
        const editing = editingId === item.id;
        return (
            <Stack
                key={item.id}
                direction="row"
                alignItems="flex-start"
                spacing={1}
                sx={{
                    py: 0.75,
                    px: 1,
                    borderRadius: '8px',
                    // Retired rows read as history, not as current advice.
                    opacity: item.is_active ? 1 : 0.5,
                    '&:hover': { bgcolor: t.rowHover },
                }}
            >
                <Box sx={{ flex: 1, minWidth: 0 }}>
                    {editing ? (
                        <TextField
                            value={editText}
                            onChange={e => setEditText(e.target.value)}
                            size="small"
                            fullWidth
                            multiline
                            autoFocus
                        />
                    ) : (
                        <Typography
                            fontSize={13}
                            sx={{
                                wordBreak: 'break-word',
                                textDecoration: item.is_active ? 'none' : 'line-through',
                            }}
                        >
                            {item.description}
                        </Typography>
                    )}
                </Box>

                {canWrite ? (
                    <Select
                        variant="outlined"
                        size="small"
                        value={item.employee_recommended_training_status_id}
                        onChange={e =>
                            updateMut.mutate({
                                id: item.id,
                                employee_recommended_training_status_id: Number(e.target.value),
                            })
                        }
                        sx={{ minWidth: 150, fontSize: 12 }}
                    >
                        {statuses.map(s => (
                            <MenuItem key={s.id} value={s.id} sx={{ fontSize: 12 }}>
                                {statusLabel(s.key, s.description)}
                            </MenuItem>
                        ))}
                    </Select>
                ) : (
                    <Chip
                        size="small"
                        label={statusLabel(item.status_key, item.status_description)}
                        sx={{ fontSize: 11 }}
                    />
                )}

                {canWrite && (
                    <Tooltip title={getString(editing ? 'doneEditing' : 'edit')}>
                        <IconButton
                            size="small"
                            onClick={() => {
                                if (editing) {
                                    const text = editText.trim();
                                    if (text) updateMut.mutate({ id: item.id, description: text });
                                    else setEditingId(null);
                                } else {
                                    setEditingId(item.id);
                                    setEditText(item.description);
                                }
                            }}
                            sx={{ p: 0.25 }}
                        >
                            {editing ? <DoneIcon sx={{ fontSize: 16 }} /> : <EditIcon sx={{ fontSize: 15 }} />}
                        </IconButton>
                    </Tooltip>
                )}

                {canWrite && (
                    <Tooltip
                        title={getString(
                            item.is_active ? 'markTrainingInactive' : 'markTrainingActive',
                        )}
                    >
                        <IconButton
                            size="small"
                            onClick={() =>
                                updateMut.mutate({ id: item.id, is_active: !item.is_active })
                            }
                            sx={{ p: 0.25 }}
                        >
                            {item.is_active
                                ? <VisibilityIcon sx={{ fontSize: 15 }} />
                                : <VisibilityOffIcon sx={{ fontSize: 15 }} />}
                        </IconButton>
                    </Tooltip>
                )}

                {canDelete && (
                    <Tooltip title={getString('delete')}>
                        <IconButton
                            size="small"
                            onClick={() => setPendingDelete(item)}
                            sx={{ p: 0.25 }}
                        >
                            <CloseIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                    </Tooltip>
                )}
            </Stack>
        );
    };

    return (
        <Box>
            <Stack direction="row" alignItems="center" justifyContent="space-between" mb={1}>
                <Typography fontSize={13} fontWeight={600}>
                    {getString('recommendedTrainings')}
                </Typography>
                <Tooltip
                    title={getString(showInactive ? 'showActiveTrainingsOnly' : 'showAllTrainings')}
                >
                    <IconButton size="small" onClick={() => setShowInactive(v => !v)} sx={{ p: 0.25 }}>
                        {showInactive
                            ? <VisibilityIcon sx={{ fontSize: 16 }} />
                            : <VisibilityOffIcon sx={{ fontSize: 16 }} />}
                    </IconButton>
                </Tooltip>
            </Stack>

            {isLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
                    <CircularProgress size={20} />
                </Box>
            ) : items.length > 0 ? (
                <Stack spacing={0.25}>{items.map(row)}</Stack>
            ) : (
                <Typography fontSize={13} color={t.textMuted}>
                    {getString('noRecommendedTrainingsYet')}
                </Typography>
            )}

            <ConfirmDeleteDialog
                open={!!pendingDelete}
                message={getString('areYouSureDeleteRecommendedTraining')}
                itemLabel={pendingDelete?.description}
                isDeleting={deleteMut.isPending}
                onConfirm={() => { if (pendingDelete) deleteMut.mutate(pendingDelete.id); }}
                onClose={() => setPendingDelete(null)}
            />

            {canWrite && (
                <Stack direction="row" spacing={1} alignItems="flex-start" mt={1.5}>
                    <TextField
                        size="small"
                        fullWidth
                        multiline
                        minRows={1}
                        placeholder={getString('recommendedTrainingPlaceholder')}
                        value={newText}
                        onChange={e => setNewText(e.target.value)}
                    />
                    <Button
                        variant="outlined"
                        size="small"
                        startIcon={<AddIcon />}
                        onClick={submitNew}
                        disabled={!newText.trim() || addMut.isPending}
                        sx={{ textTransform: 'none', whiteSpace: 'nowrap', mt: 0.25 }}
                    >
                        {getString('add')}
                    </Button>
                </Stack>
            )}
        </Box>
    );
}

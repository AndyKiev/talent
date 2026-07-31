// src/components/person_events/LastNameHistoryPanel.tsx
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    Alert,
    Box,
    Button,
    Chip,
    IconButton,
    Snackbar,
    Stack,
    Tooltip,
    Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import dayjs from 'dayjs';
import useString from '../../hooks/useString';
import { DATE_FORMAT } from '../../utils/eNums';
import { PERSON_EVENTS_QK } from '../../utils/queryKeys';
import LastNameChangeDialog from './LastNameChangeDialog';
import {
    changePersonEventStatus,
    createLastNameChange,
    deletePersonEvent,
    fetchPersonEvents,
    PersonEventStatus,
    PersonEventTypeKey,
    type LastNameChangeCreate,
    type PersonEvent,
} from './personEventApi';
import { personEventStatusColor, personEventStatusLabel } from './personEventStatus';

interface Props {
    personId: number | null;
    currentLastName: string | null;
    /** Only admin / dev / HRM / HRS reach the write path; the backend enforces
     *  it too (and narrows HRM to their scope), so this only hides the buttons. */
    canEdit?: boolean;
    onApplied?: () => void;
}

const surnameChanges = (events: PersonEvent[]) =>
    events.filter((e) => e.event_type?.key === PersonEventTypeKey.LastNameChange);

/**
 * Surname history for one person, shown on the employee personal-information
 * tab: what it was, what it became, and since when.
 *
 * A change is drafted, marked ready, then applied — only the last step renames
 * the person, and the scheduler does it automatically once the date arrives.
 * The buttons offered come from the event's own `allowed_targets`, which the
 * backend reads from its state machine, so the UI cannot offer an illegal move.
 */
export default function LastNameHistoryPanel({
    personId,
    currentLastName,
    canEdit = false,
    onApplied,
}: Props) {
    const getString = useString();
    const qc = useQueryClient();
    const [dialogOpen, setDialogOpen] = useState(false);
    // Every rule here is enforced server-side and reported as a translated
    // domain message (male person, unknown sex, out of scope, illegal
    // transition). Without this the user gets a silent 400 and a dead form.
    const [snackbar, setSnackbar] = useState<{
        open: boolean;
        message: string;
        severity: 'success' | 'error';
    }>({ open: false, message: '', severity: 'success' });

    const notifyError = (err: Error) =>
        setSnackbar({ open: true, message: err.message, severity: 'error' });
    const notifyOk = (message: string) =>
        setSnackbar({ open: true, message, severity: 'success' });

    const { data: events = [] } = useQuery({
        queryKey: [...PERSON_EVENTS_QK, personId],
        queryFn: () => fetchPersonEvents(personId as number),
        enabled: personId != null,
    });

    // Applying a change renames the person, and every display name in the app is
    // composed from that record server-side — so the whole cache is stale, not
    // just this list.
    const invalidate = async (renamed: boolean) => {
        if (renamed) {
            await qc.invalidateQueries();
            onApplied?.();
        } else {
            await qc.invalidateQueries({ queryKey: [...PERSON_EVENTS_QK, personId] });
        }
    };

    const createMut = useMutation({
        mutationFn: createLastNameChange,
        onSuccess: async (res) => {
            await invalidate(false);
            setDialogOpen(false);
            notifyOk(res.detail);
        },
        onError: notifyError,
    });
    const statusMut = useMutation({
        mutationFn: changePersonEventStatus,
        onSuccess: async (res, vars) => {
            await invalidate(vars.status === PersonEventStatus.Applied);
            notifyOk(res.detail);
        },
        onError: notifyError,
    });
    const deleteMut = useMutation({
        mutationFn: deletePersonEvent,
        onSuccess: () => invalidate(false),
        onError: notifyError,
    });

    const rows = surnameChanges(events);

    const submit = (data: LastNameChangeCreate) => {
        if (personId != null) createMut.mutate({ personId, data });
    };

    return (
        <Box>
            <Stack direction="row" alignItems="center" justifyContent="space-between">
                <Typography variant="subtitle2">{getString('lastNameHistory')}</Typography>
                {canEdit && personId != null && (
                    <Button
                        size="small"
                        startIcon={<AddIcon />}
                        onClick={() => setDialogOpen(true)}
                    >
                        {getString('lastNameChange')}
                    </Button>
                )}
            </Stack>

            {rows.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    {getString('noLastNameChanges')}
                </Typography>
            ) : (
                <Stack spacing={1} sx={{ mt: 1 }}>
                    {rows.map((e) => {
                        const change = e.changes[0];
                        const statusName = e.status?.name ?? PersonEventStatus.Draft;
                        return (
                            <Stack
                                key={e.id}
                                direction="row"
                                spacing={1}
                                alignItems="center"
                                flexWrap="wrap"
                            >
                                <Typography variant="body2">
                                    {/* prev_value is only known once applied — until
                                        then show the live surname as the "from". */}
                                    {change?.prev_value ?? currentLastName ?? ''}
                                    {' → '}
                                    <Box component="span" fontWeight={600}>
                                        {change?.new_value ?? ''}
                                    </Box>
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                    {getString('changedSince')}:{' '}
                                    {dayjs(e.effective_date).format(DATE_FORMAT)}
                                </Typography>
                                <Chip
                                    size="small"
                                    label={personEventStatusLabel(statusName, getString)}
                                    color={personEventStatusColor(statusName)}
                                />
                                {e.created_by_name && (
                                    <Typography variant="caption" color="text.secondary">
                                        {e.created_by_name}
                                    </Typography>
                                )}
                                {canEdit &&
                                    e.allowed_targets.map((target) => (
                                        <Button
                                            key={target}
                                            size="small"
                                            disabled={statusMut.isPending}
                                            onClick={() =>
                                                statusMut.mutate({ id: e.id, status: target })
                                            }
                                        >
                                            {personEventStatusLabel(target, getString)}
                                        </Button>
                                    ))}
                                {canEdit && statusName !== PersonEventStatus.Applied && (
                                    <Tooltip title={getString('delete')}>
                                        <IconButton
                                            size="small"
                                            disabled={deleteMut.isPending}
                                            onClick={() => deleteMut.mutate(e.id)}
                                        >
                                            <DeleteOutlineIcon fontSize="small" />
                                        </IconButton>
                                    </Tooltip>
                                )}
                            </Stack>
                        );
                    })}
                </Stack>
            )}

            <LastNameChangeDialog
                open={dialogOpen}
                currentLastName={currentLastName}
                saving={createMut.isPending}
                onClose={() => setDialogOpen(false)}
                onSubmit={submit}
            />

            <Snackbar
                open={snackbar.open}
                autoHideDuration={6000}
                onClose={() => setSnackbar((p) => ({ ...p, open: false }))}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            >
                <Alert
                    severity={snackbar.severity}
                    onClose={() => setSnackbar((p) => ({ ...p, open: false }))}
                    sx={{ width: '100%' }}
                >
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Box>
    );
}

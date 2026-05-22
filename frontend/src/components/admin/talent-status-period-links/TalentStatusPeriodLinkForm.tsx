// src/components/admin/talent-status-period-links/TalentStatusPeriodLinkForm.tsx
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod/v4';
import { useQuery } from '@tanstack/react-query';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    MenuItem,
    Button,
    Box,
    Alert,
    CircularProgress,
    FormControlLabel,
    Switch,
    Typography,
} from '@mui/material';
import type { UseMutationResult } from '@tanstack/react-query';
import type {
    TalentStatusPeriodLinkCreate,
    MutationResponse,
    TalentStatusPeriodLink,
} from './talentStatusPeriodLinkApi';
import { fetchTalentPeriods } from '../talent-periods/talentPeriodApi';
import { TALENT_PERIOD_QK } from '../talent-periods/useTalentPeriodMutations';
import useString from '../../../hooks/useString';
import cfl from '../../../utils/capitalizeFirstLetter';
import str from '../../../strings/str';

// We fetch talent statuses from their own API endpoint.
// Reuse the same base URL pattern used by other API files.
import { axiosInstance } from '../../../api/axiosInstance';
import { BASE_URL } from '../../../utils/eNums';

const TALENT_STATUS_QK = ['talent_statuses'] as const;

interface TalentStatusOption {
    id: number;
    key: string;
    name: string;
    is_active: boolean;
}

const fetchTalentStatuses = async (): Promise<TalentStatusOption[]> => {
    const res = await axiosInstance.get<TalentStatusOption[]>(`${BASE_URL}/admin/talent-statuses`);
    return res.data ?? [];
};

// ── Schema ────────────────────────────────────────────────────────────────────

const schema = z.object({
    talent_period_id: z.number({ error: 'required' }).min(1, 'required'),
    talent_status_id: z.number({ error: 'required' }).min(1, 'required'),
    is_active: z.boolean(),
});

type FormData = z.infer<typeof schema>;

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
    open: boolean;
    onClose: () => void;
    createMutation: UseMutationResult<
        MutationResponse<TalentStatusPeriodLink>,
        Error,
        TalentStatusPeriodLinkCreate
    >;
}

export function TalentStatusPeriodLinkForm({ open, onClose, createMutation }: Props) {
    const getString = useString({ str });

    const { data: periods = [], isLoading: periodsLoading } = useQuery({
        queryKey: TALENT_PERIOD_QK,
        queryFn: fetchTalentPeriods,
        staleTime: 2 * 60 * 1000,
    });

    const { data: statuses = [], isLoading: statusesLoading } = useQuery({
        queryKey: TALENT_STATUS_QK,
        queryFn: fetchTalentStatuses,
        staleTime: 2 * 60 * 1000,
    });

    const {
        control,
        handleSubmit,
        formState: { errors },
        reset,
    } = useForm<FormData>({
        resolver: zodResolver(schema),
        defaultValues: {
            talent_period_id: 0,
            talent_status_id: 0,
            is_active: true,
        },
    });

    const handleClose = () => {
        reset();
        onClose();
    };

    const onSubmit = (data: FormData) => {
        createMutation.mutate({
            talent_period_id: data.talent_period_id,
            talent_status_id: data.talent_status_id,
            is_active: data.is_active,
        });
    };

    const activePeriods = periods.filter((p) => p.is_active);
    const activeStatuses = statuses.filter((s) => s.is_active);

    return (
        <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
            <DialogTitle>
                {cfl(getString('createTalentStatusPeriodLink')) || 'Create Status–Period Link'}
            </DialogTitle>

            <DialogContent>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, mt: 1 }}>
                    {createMutation.isError && (
                        <Alert severity="error">{createMutation.error?.message}</Alert>
                    )}

                    {/* Talent Period select */}
                    <Controller
                        name="talent_period_id"
                        control={control}
                        render={({ field }) => (
                            <TextField
                                select
                                fullWidth
                                label={cfl(getString('talentPeriod')) || 'Talent Period'}
                                error={!!errors.talent_period_id}
                                helperText={
                                    errors.talent_period_id?.message &&
                                    (getString(errors.talent_period_id.message) ||
                                        errors.talent_period_id.message)
                                }
                                value={field.value || ''}
                                onChange={(e) => field.onChange(Number(e.target.value))}
                                disabled={periodsLoading}
                                slotProps={{
                                    select: { displayEmpty: true },
                                }}
                            >
                                {periodsLoading ? (
                                    <MenuItem value="" disabled>
                                        <CircularProgress size={16} sx={{ mr: 1 }} />
                                        {getString('loading') || 'Loading…'}
                                    </MenuItem>
                                ) : activePeriods.length === 0 ? (
                                    <MenuItem value="" disabled>
                                        <Typography variant="body2" color="text.secondary">
                                            {getString('noActivePeriods') || 'No active periods'}
                                        </Typography>
                                    </MenuItem>
                                ) : (
                                    activePeriods.map((p) => (
                                        <MenuItem key={p.id} value={p.id}>
                                            {p.name}
                                            {p.description && (
                                                <Typography
                                                    component="span"
                                                    variant="caption"
                                                    color="text.secondary"
                                                    sx={{ ml: 1 }}
                                                >
                                                    — {p.description}
                                                </Typography>
                                            )}
                                        </MenuItem>
                                    ))
                                )}
                            </TextField>
                        )}
                    />

                    {/* Talent Status select */}
                    <Controller
                        name="talent_status_id"
                        control={control}
                        render={({ field }) => (
                            <TextField
                                select
                                fullWidth
                                label={cfl(getString('talentStatus')) || 'Talent Status'}
                                error={!!errors.talent_status_id}
                                helperText={
                                    errors.talent_status_id?.message &&
                                    (getString(errors.talent_status_id.message) ||
                                        errors.talent_status_id.message)
                                }
                                value={field.value || ''}
                                onChange={(e) => field.onChange(Number(e.target.value))}
                                disabled={statusesLoading}
                                slotProps={{
                                    select: { displayEmpty: true },
                                }}
                            >
                                {statusesLoading ? (
                                    <MenuItem value="" disabled>
                                        <CircularProgress size={16} sx={{ mr: 1 }} />
                                        {getString('loading') || 'Loading…'}
                                    </MenuItem>
                                ) : activeStatuses.length === 0 ? (
                                    <MenuItem value="" disabled>
                                        <Typography variant="body2" color="text.secondary">
                                            {getString('noActiveStatuses') || 'No active statuses'}
                                        </Typography>
                                    </MenuItem>
                                ) : (
                                    activeStatuses.map((s) => (
                                        <MenuItem key={s.id} value={s.id}>
                                            <Typography
                                                component="span"
                                                sx={{ fontFamily: 'monospace', mr: 1 }}
                                            >
                                                {s.key}
                                            </Typography>
                                            — {s.name}
                                        </MenuItem>
                                    ))
                                )}
                            </TextField>
                        )}
                    />

                    {/* is_active toggle */}
                    <Controller
                        name="is_active"
                        control={control}
                        render={({ field }) => (
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={field.value}
                                        onChange={(_, checked) => field.onChange(checked)}
                                    />
                                }
                                label={cfl(getString('isActive')) || 'Active'}
                            />
                        )}
                    />
                </Box>
            </DialogContent>

            <DialogActions>
                <Button
                    variant="outlined"
                    onClick={handleClose}
                    disabled={createMutation.isPending}
                >
                    {getString('cancel') || 'Cancel'}
                </Button>
                <Button
                    variant="contained"
                    onClick={handleSubmit(onSubmit)}
                    disabled={createMutation.isPending}
                    startIcon={
                        createMutation.isPending ? (
                            <CircularProgress size={16} color="inherit" />
                        ) : undefined
                    }
                >
                    {getString('create') || 'Create'}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
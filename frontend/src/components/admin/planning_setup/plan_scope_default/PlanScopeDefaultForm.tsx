// src/components/admin/planning_setup/plan_scope_default/PlanScopeDefaultForm.tsx
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod/v4';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Box,
    Alert,
    CircularProgress,
    MenuItem,
    Select,
    InputLabel,
    FormControl,
    FormHelperText,
    Typography,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import type { UseMutationResult } from '@tanstack/react-query';
import {
    fetchJobGroupsRef,
    fetchTalentStatusesRef,
    type PlanScopeDefault,
    type PlanScopeDefaultCreate,
    type MutationResponse,
} from '../planningSetupApi';
import useString from '../../../../hooks/useString.ts';
import cfl from '../../../../utils/helpers.ts';
import str from '../../../../strings/str.ts';

// talent_status_id: -1 sentinel = "Combined (all)" -> sent as null
const COMBINED = -1;

const schema = z.object({
    job_group_id: z.number({ error: 'jobGroupRequired' }),
    talent_status_id: z.number({ error: 'talentStatusRequired' }),
});

type FormData = z.infer<typeof schema>;

interface Props {
    open: boolean;
    onClose: () => void;
    createMutation: UseMutationResult<MutationResponse<PlanScopeDefault>, Error, PlanScopeDefaultCreate>;
}

export function PlanScopeDefaultForm({ open, onClose, createMutation }: Props) {
    const getString = useString({ str });

    const { data: jobGroups = [] } = useQuery({
        queryKey: ['job_groups'],
        queryFn: fetchJobGroupsRef,
        staleTime: 5 * 60 * 1000,
    });

    const { data: talentStatuses = [] } = useQuery({
        queryKey: ['talent_statuses'],
        queryFn: fetchTalentStatusesRef,
        staleTime: 5 * 60 * 1000,
    });

    const {
        handleSubmit,
        control,
        formState: { errors },
        reset,
    } = useForm<FormData>({
        resolver: zodResolver(schema),
        defaultValues: { job_group_id: undefined, talent_status_id: COMBINED },
    });

    const handleClose = () => {
        reset();
        onClose();
    };

    const onSubmit = (data: FormData) => {
        createMutation.mutate({
            job_group_id: data.job_group_id,
            talent_status_id: data.talent_status_id === COMBINED ? null : data.talent_status_id,
        });
    };

    return (
        <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
            <DialogTitle>
                {cfl(getString('addPlanScopeDefault')) || 'Add Planning Scope Profile'}
            </DialogTitle>
            <DialogContent>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                    {createMutation.isError && (
                        <Alert severity="error">{createMutation.error?.message}</Alert>
                    )}

                    <Controller
                        name="job_group_id"
                        control={control}
                        render={({ field }) => (
                            <FormControl fullWidth error={!!errors.job_group_id}>
                                <InputLabel>{cfl(getString('jobGroup') || 'Job group')}</InputLabel>
                                <Select
                                    {...field}
                                    value={field.value ?? ''}
                                    label={cfl(getString('jobGroup') || 'Job group')}
                                    onChange={(e) => field.onChange(Number(e.target.value))}
                                >
                                    {jobGroups.map((g) => (
                                        <MenuItem key={g.id} value={g.id}>
                                            {g.name}
                                        </MenuItem>
                                    ))}
                                </Select>
                                {errors.job_group_id && (
                                    <FormHelperText>
                                        {getString(errors.job_group_id.message ?? '') ||
                                            errors.job_group_id.message}
                                    </FormHelperText>
                                )}
                            </FormControl>
                        )}
                    />

                    <Controller
                        name="talent_status_id"
                        control={control}
                        render={({ field }) => (
                            <FormControl fullWidth error={!!errors.talent_status_id}>
                                <InputLabel>{cfl(getString('talentStatus') || 'Talent status')}</InputLabel>
                                <Select
                                    {...field}
                                    value={field.value ?? COMBINED}
                                    label={cfl(getString('talentStatus') || 'Talent status')}
                                    onChange={(e) => field.onChange(Number(e.target.value))}
                                >
                                    <MenuItem value={COMBINED}>
                                        {getString('combinedOption') || 'Combined (all statuses)'}
                                    </MenuItem>
                                    {talentStatuses.map((tsItem) => (
                                        <MenuItem key={tsItem.id} value={tsItem.id}>
                                            {tsItem.key} — {tsItem.name}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        )}
                    />

                    <Typography variant="caption" color="text.secondary">
                        {getString('planScopeDefaultHint') ||
                            'Combined produces one plan row per department/job group. A specific status produces one row per active status at session creation.'}
                    </Typography>
                </Box>
            </DialogContent>
            <DialogActions>
                <Button variant="outlined" onClick={handleClose} disabled={createMutation.isPending}>
                    {getString('cancel') || 'Cancel'}
                </Button>
                <Button
                    variant="contained"
                    onClick={handleSubmit(onSubmit)}
                    disabled={createMutation.isPending}
                    startIcon={createMutation.isPending ? <CircularProgress size={16} color="inherit" /> : undefined}
                >
                    {getString('add') || 'Add'}
                </Button>
            </DialogActions>
        </Dialog>
    );
}

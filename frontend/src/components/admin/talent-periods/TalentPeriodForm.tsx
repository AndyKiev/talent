// src/components/admin/talent-periods/TalentPeriodForm.tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod/v4';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Button,
    Box,
    Alert,
    CircularProgress,
    FormControlLabel,
    Switch,
} from '@mui/material';
import type { UseMutationResult } from '@tanstack/react-query';
import type { TalentPeriodCreate, MutationResponse, TalentPeriod } from './talentPeriodApi';
import useString from "../../../hooks/useString.ts";
import cfl from "../../../utils/helpers.ts";
import str from "../../../strings/str.ts";

const schema = z.object({
    name: z.string().min(1, 'nameRequired').max(32, 'nameTooLong'),
    description: z.string().max(64, 'descriptionTooLong').optional().or(z.literal('')),
    is_active: z.boolean(),
    qty_months: z.number()
        .int('qtyMonthsInteger')
        .min(0, 'qtyMonthsMin')  // Changed from 1 to 0
        .max(120, 'qtyMonthsMax'),
});

type FormData = z.infer<typeof schema>;

interface Props {
    open: boolean;
    onClose: () => void;
    createMutation: UseMutationResult<MutationResponse<TalentPeriod>, Error, TalentPeriodCreate>;
}

export function TalentPeriodForm({ open, onClose, createMutation }: Props) {
    const getString = useString({ str });

    const {
        register,
        handleSubmit,
        formState: { errors },
        reset,
        watch,
        setValue,
    } = useForm<FormData>({
        resolver: zodResolver(schema),
        defaultValues: { name: '', description: '', is_active: true, qty_months: 12 }, // Added default
    });

    const handleClose = () => {
        reset();
        onClose();
    };

    const onSubmit = (data: FormData) => {
        createMutation.mutate({
            name: data.name,
            description: data.description || null,
            is_active: data.is_active,
            qty_months: data.qty_months, // Added
        });
    };

    return (
        <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
            <DialogTitle>{cfl(getString('createTalentPeriod')) || 'Create Talent Period'}</DialogTitle>
            <DialogContent>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                    {createMutation.isError && (
                        <Alert severity="error">{createMutation.error?.message}</Alert>
                    )}

                    <TextField
                        label={cfl(getString('name')) || 'Name'}
                        fullWidth
                        slotProps={{ htmlInput: { maxLength: 32 } }}
                        error={!!errors.name}
                        helperText={errors.name?.message && (getString(errors.name.message) || errors.name.message)}
                        {...register('name')}
                    />

                    <TextField
                        label={cfl(getString('description')) || 'Description'}
                        fullWidth
                        multiline
                        minRows={2}
                        slotProps={{ htmlInput: { maxLength: 64 } }}
                        error={!!errors.description}
                        helperText={
                            errors.description?.message &&
                            (getString(errors.description.message) || errors.description.message)
                        }
                        {...register('description')}
                    />

                    <TextField
                        label={cfl(getString('qtyMonths')) || 'Duration (months)'}
                        type="number"
                        fullWidth
                        slotProps={{
                            htmlInput: { min: 1, max: 120, step: 1 }
                        }}
                        error={!!errors.qty_months}
                        helperText={
                            errors.qty_months?.message &&
                            (getString(errors.qty_months.message) || errors.qty_months.message)
                        }
                        {...register('qty_months', { valueAsNumber: true })}
                    />

                    <FormControlLabel
                        control={
                            <Switch
                                checked={watch('is_active')}
                                onChange={(_, checked) => setValue('is_active', checked)}
                            />
                        }
                        label={cfl(getString('isActive')) || 'Active'}
                    />
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
                    {getString('create') || 'Create'}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
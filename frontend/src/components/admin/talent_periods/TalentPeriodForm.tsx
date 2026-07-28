// src/components/admin/talent-periods/TalentPeriodForm.tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod/v4';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    TextField,
    Box,
    Alert,
} from '@mui/material';
import { FormSwitch } from '../../ui/FormSwitch';
import { FormTextField } from '../../ui/FormTextField';
import type { UseMutationResult } from '@tanstack/react-query';
import type { TalentPeriodCreate, MutationResponse, TalentPeriod } from './talentPeriodApi';
import useString from "../../../hooks/useString.ts";
import cfl from "../../../utils/helpers.ts";
import str from "../../../strings/str.ts";
import { CrudFormActions } from '../../ui/CrudFormActions';

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
        control,
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

                    <FormTextField
                        label={cfl(getString('name')) || 'Name'}
                        getString={getString}
                        maxLength={32}
                        fieldError={errors.name}
                        {...register('name')}
                    />

                    <FormTextField
                        label={cfl(getString('description')) || 'Description'}
                        getString={getString}
                        multiline
                        minRows={2}
                        maxLength={64}
                        fieldError={errors.description}
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

                    <FormSwitch
                        name="is_active"
                        control={control}
                        label={cfl(getString('isActive')) || 'Active'}
                    />
                </Box>
            </DialogContent>
            <CrudFormActions
                getString={getString}
                onCancel={handleClose}
                onSubmit={handleSubmit(onSubmit)}
                isPending={createMutation.isPending}
            />
        </Dialog>
    );
}

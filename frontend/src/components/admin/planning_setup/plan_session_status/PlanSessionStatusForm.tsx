// src/components/admin/planning_setup/plan_session_status/PlanSessionStatusForm.tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod/v4';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    Box,
    Alert,
} from '@mui/material';
import type { UseMutationResult } from '@tanstack/react-query';
import type {
    PlanSessionStatusCreate,
    MutationResponse,
    PlanSessionStatus,
} from '../planningSetupApi';
import useString from '../../../../hooks/useString.ts';
import cfl from '../../../../utils/helpers.ts';
import str from '../../../../strings/str.ts';
import { CrudFormActions } from '../../../ui/CrudFormActions';
import { FormTextField } from '../../../ui/FormTextField';

const schema = z.object({
    key: z.string().min(1, 'keyRequired').max(16, 'keyTooLong'),
    name: z.string().min(1, 'nameRequired').max(64, 'nameTooLong'),
    description: z.string().max(256, 'descriptionTooLong').optional().or(z.literal('')),
});

type FormData = z.infer<typeof schema>;

interface Props {
    open: boolean;
    onClose: () => void;
    createMutation: UseMutationResult<MutationResponse<PlanSessionStatus>, Error, PlanSessionStatusCreate>;
}

export function PlanSessionStatusForm({ open, onClose, createMutation }: Props) {
    const getString = useString({ str });

    const {
        register,
        handleSubmit,
        formState: { errors },
        reset,
    } = useForm<FormData>({
        resolver: zodResolver(schema),
        defaultValues: { key: '', name: '', description: '' },
    });

    const handleClose = () => {
        reset();
        onClose();
    };

    const onSubmit = (data: FormData) => {
        createMutation.mutate({
            key: data.key,
            name: data.name,
            description: data.description || null,
        });
    };

    return (
        <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
            <DialogTitle>
                {cfl(getString('createPlanSessionStatus')) || 'Create Plan Session Status'}
            </DialogTitle>
            <DialogContent>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                    {createMutation.isError && (
                        <Alert severity="error">{createMutation.error?.message}</Alert>
                    )}
                    <FormTextField
                        label={cfl(getString('key')) || 'Key'}
                        getString={getString}
                        maxLength={16}
                        fieldError={errors.key}
                        {...register('key')}
                    />
                    <FormTextField
                        label={cfl(getString('name')) || 'Name'}
                        getString={getString}
                        maxLength={64}
                        fieldError={errors.name}
                        {...register('name')}
                    />
                    <FormTextField
                        label={cfl(getString('description')) || 'Description'}
                        getString={getString}
                        multiline
                        minRows={2}
                        maxLength={256}
                        fieldError={errors.description}
                        {...register('description')}
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

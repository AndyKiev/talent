// src/components/admin/department_types/DepartmentTypeForm.tsx
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
import type { DepartmentTypeCreate, MutationResponse, DepartmentType } from './departmentTypeApi';
import useString from '../../../hooks/useString.ts';
import cfl from '../../../utils/helpers.ts';
import str from '../../../strings/str.ts';
import { FormSwitch } from '../../ui/FormSwitch';
import { CrudFormActions } from '../../ui/CrudFormActions';
import { FormTextField } from '../../ui/FormTextField';

const schema = z.object({
    name: z.string().min(1, 'nameRequired').max(128, 'nameTooLong'),
    description: z.string().max(256, 'descriptionTooLong').optional().or(z.literal('')),
    is_active: z.boolean(),
});

type FormData = z.infer<typeof schema>;

interface Props {
    open: boolean;
    onClose: () => void;
    createMutation: UseMutationResult<MutationResponse<DepartmentType>, Error, DepartmentTypeCreate>;
}

export function DepartmentTypeForm({ open, onClose, createMutation }: Props) {
    const getString = useString({ str });

    const {
        register,
        handleSubmit,
        formState: { errors },
        reset,
        control,
    } = useForm<FormData>({
        resolver: zodResolver(schema),
        defaultValues: { name: '', description: '', is_active: true },
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
        });
    };

    return (
        <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
            <DialogTitle>{cfl(getString('createDepartmentType')) || 'Create Department Type'}</DialogTitle>
            <DialogContent>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                    {createMutation.isError && (
                        <Alert severity="error">{createMutation.error?.message}</Alert>
                    )}
                    <FormTextField
                        label={cfl(getString('name')) || 'Name'}
                        getString={getString}
                        maxLength={128}
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

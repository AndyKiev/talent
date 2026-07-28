// src/components/admin/department_categories/DepartmentCategoryForm.tsx
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
import type { DepartmentCategoryCreate, MutationResponse, DepartmentCategory } from './departmentCategoryApi';
import useString from '../../../hooks/useString.ts';
import cfl from '../../../utils/helpers.ts';
import str from '../../../strings/str.ts';
import { FormSwitch } from '../../ui/FormSwitch';
import { CrudFormActions } from '../../ui/CrudFormActions';
import { FormTextField } from '../../ui/FormTextField';

const schema = z.object({
    name: z.string().min(1, 'nameRequired').max(64, 'nameTooLong'),
    key: z.string().max(64, 'keyTooLong').optional().or(z.literal('')),
    description: z.string().max(256, 'descriptionTooLong').optional().or(z.literal('')),
    is_active: z.boolean(),
    is_main: z.boolean(),
    is_responsibility: z.boolean(),
});

type FormData = z.infer<typeof schema>;

interface Props {
    open: boolean;
    onClose: () => void;
    createMutation: UseMutationResult<MutationResponse<DepartmentCategory>, Error, DepartmentCategoryCreate>;
}

export function DepartmentCategoryForm({ open, onClose, createMutation }: Props) {
    const getString = useString({ str });

    const {
        register,
        handleSubmit,
        formState: { errors },
        reset,
        control,
    } = useForm<FormData>({
        resolver: zodResolver(schema),
        defaultValues: { name: '', key: '', description: '', is_active: true, is_main: false, is_responsibility: false },
    });

    const handleClose = () => {
        reset();
        onClose();
    };

    const onSubmit = (data: FormData) => {
        createMutation.mutate({
            name: data.name,
            key: data.key || null,
            description: data.description || null,
            is_active: data.is_active,
            is_main: data.is_main,
            is_responsibility: data.is_responsibility,
        });
    };

    return (
        <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
            <DialogTitle>{cfl(getString('createDepartmentCategory')) || 'Create Department Category'}</DialogTitle>
            <DialogContent>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                    {createMutation.isError && (
                        <Alert severity="error">{createMutation.error?.message}</Alert>
                    )}
                    <FormTextField
                        label={cfl(getString('name')) || 'Name'}
                        getString={getString}
                        maxLength={64}
                        fieldError={errors.name}
                        {...register('name')}
                    />
                    <FormTextField
                        label={cfl(getString('key')) || 'Key'}
                        getString={getString}
                        maxLength={64}
                        fieldError={errors.key}
                        {...register('key')}
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
                    <FormSwitch
                        name="is_main"
                        control={control}
                        label={cfl(getString('isMain')) || 'Main'}
                    />
                    <FormSwitch
                        name="is_responsibility"
                        control={control}
                        label={cfl(getString('isResponsibility')) || 'Responsibility list'}
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

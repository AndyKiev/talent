// src/components/admin/department_categories/DepartmentCategoryForm.tsx
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
import type { DepartmentCategoryCreate, MutationResponse, DepartmentCategory } from './departmentCategoryApi';
import useString from '../../../hooks/useString.ts';
import cfl from '../../../utils/helpers.ts';
import str from '../../../strings/str.ts';

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
        watch,
        setValue,
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
                    <TextField
                        label={cfl(getString('name')) || 'Name'}
                        fullWidth
                        slotProps={{ htmlInput: { maxLength: 64 } }}
                        error={!!errors.name}
                        helperText={errors.name?.message && (getString(errors.name.message) || errors.name.message)}
                        {...register('name')}
                    />
                    <TextField
                        label={cfl(getString('key')) || 'Key'}
                        fullWidth
                        slotProps={{ htmlInput: { maxLength: 64 } }}
                        error={!!errors.key}
                        helperText={errors.key?.message && (getString(errors.key.message) || errors.key.message)}
                        {...register('key')}
                    />
                    <TextField
                        label={cfl(getString('description')) || 'Description'}
                        fullWidth
                        multiline
                        minRows={2}
                        slotProps={{ htmlInput: { maxLength: 256 } }}
                        error={!!errors.description}
                        helperText={
                            errors.description?.message &&
                            (getString(errors.description.message) || errors.description.message)
                        }
                        {...register('description')}
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
                    <FormControlLabel
                        control={
                            <Switch
                                checked={watch('is_main')}
                                onChange={(_, checked) => setValue('is_main', checked)}
                            />
                        }
                        label={cfl(getString('isMain')) || 'Main'}
                    />
                    <FormControlLabel
                        control={
                            <Switch
                                checked={watch('is_responsibility')}
                                onChange={(_, checked) => setValue('is_responsibility', checked)}
                            />
                        }
                        label={cfl(getString('isResponsibility')) || 'Responsibility list'}
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

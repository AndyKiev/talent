// src/components/admin/job_categories/JobCategoryForm.tsx
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
} from '@mui/material';
import type { UseMutationResult } from '@tanstack/react-query';
import type { JobCategoryCreate, MutationResponse, JobCategory } from './jobCategoryApi';
import useString from '../../../hooks/useString.ts';
import cfl from '../../../utils/helpers.ts';

const schema = z.object({
    // snake_case key — drives the translated label via getString(snakeToCamel(key)).
    key: z.string().min(1, 'keyRequired').max(64, 'keyTooLong'),
    description: z.string().max(256, 'descriptionTooLong').optional().or(z.literal('')),
});

type FormData = z.infer<typeof schema>;

interface Props {
    open: boolean;
    onClose: () => void;
    createMutation: UseMutationResult<MutationResponse<JobCategory>, Error, JobCategoryCreate>;
    nextSortOrder: number;
}

export function JobCategoryForm({ open, onClose, createMutation, nextSortOrder }: Props) {
    const getString = useString();

    const {
        register,
        handleSubmit,
        formState: { errors },
        reset,
    } = useForm<FormData>({
        resolver: zodResolver(schema),
        defaultValues: { key: '', description: '' },
    });

    const handleClose = () => {
        reset();
        onClose();
    };

    const onSubmit = (data: FormData) => {
        createMutation.mutate({
            key: data.key,
            description: data.description || null,
            sort_order: nextSortOrder,
        });
    };

    return (
        <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
            <DialogTitle>{cfl(getString('createJobCategory')) || 'Create Job Category'}</DialogTitle>
            <DialogContent>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                    {createMutation.isError && (
                        <Alert severity="error">{createMutation.error?.message}</Alert>
                    )}
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

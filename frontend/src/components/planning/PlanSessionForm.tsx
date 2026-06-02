// src/components/planning/PlanSessionForm.tsx
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
import type {
    PlanSessionCreate,
    MutationResponse,
    PlanSession,
} from './planningApi';
import useString from '../../hooks/useString.ts';
import cfl from '../../utils/helpers.ts';
import str from '../../strings/str.ts';

const schema = z
    .object({
        name: z.string().min(1, 'nameRequired').max(64, 'nameTooLong'),
        description: z.string().max(256, 'descriptionTooLong').optional().or(z.literal('')),
        start_date: z.string().min(1, 'startDateRequired'),
        end_date: z.string().min(1, 'endDateRequired'),
    })
    .refine((d) => d.end_date >= d.start_date, {
        path: ['end_date'],
        message: 'endDateBeforeStart',
    });

type FormData = z.infer<typeof schema>;

const yearStart = () => `${new Date().getFullYear()}-01-01`;
const yearEnd = () => `${new Date().getFullYear()}-12-31`;

interface Props {
    open: boolean;
    onClose: () => void;
    createMutation: UseMutationResult<MutationResponse<PlanSession>, Error, PlanSessionCreate>;
}

export function PlanSessionForm({ open, onClose, createMutation }: Props) {
    const getString = useString({ str });

    const {
        register,
        handleSubmit,
        formState: { errors },
        reset,
    } = useForm<FormData>({
        resolver: zodResolver(schema),
        defaultValues: {
            name: '',
            description: '',
            start_date: yearStart(),
            end_date: yearEnd(),
        },
    });

    const handleClose = () => {
        reset();
        onClose();
    };

    const onSubmit = (data: FormData) => {
        createMutation.mutate({
            name: data.name,
            description: data.description || null,
            start_date: data.start_date,
            end_date: data.end_date,
        });
    };

    return (
        <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
            <DialogTitle>{cfl(getString('createPlanSession')) || 'Create Plan Session'}</DialogTitle>
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
                    <TextField
                        label={cfl(getString('startDate')) || 'Start date'}
                        type="date"
                        fullWidth
                        slotProps={{ inputLabel: { shrink: true } }}
                        error={!!errors.start_date}
                        helperText={
                            errors.start_date?.message &&
                            (getString(errors.start_date.message) || errors.start_date.message)
                        }
                        {...register('start_date')}
                    />
                    <TextField
                        label={cfl(getString('endDate')) || 'End date'}
                        type="date"
                        fullWidth
                        slotProps={{ inputLabel: { shrink: true } }}
                        error={!!errors.end_date}
                        helperText={
                            errors.end_date?.message &&
                            (getString(errors.end_date.message) || errors.end_date.message)
                        }
                        {...register('end_date')}
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

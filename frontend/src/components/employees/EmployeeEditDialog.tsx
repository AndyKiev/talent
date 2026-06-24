// src/components/employees/EmployeeEditDialog.tsx
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod/v4';
import type { UseMutationResult } from '@tanstack/react-query';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    FormControlLabel,
    Switch,
    Box,
    Alert,
    CircularProgress,
    Chip,
    Typography,
    Divider,
} from '@mui/material';
import type { Employee, EmployeeUpdate } from './employeeApi';
import useString from '../../hooks/useString';
import str from '../../strings/str';
import cfl from '../../utils/helpers.ts';

const schema = z.object({
    name: z.string().min(1, 'nameRequired').max(100, 'nameTooLong'),
    email: z.string().max(100).email('invalidEmail').optional().or(z.literal('')),
    is_active: z.boolean(),
});

type FormData = z.infer<typeof schema>;

interface Props {
    employee: Employee | null;
    onClose: () => void;
    updateMutation: UseMutationResult<Employee, Error, { id: number; data: EmployeeUpdate }>;
}

export function EmployeeEditDialog({ employee, onClose, updateMutation }: Props) {
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
        defaultValues: { name: '', email: '', is_active: true },
    });

    // Populate form when employee changes
    useEffect(() => {
        if (employee) {
            reset({
                name: employee.name,
                email: employee.email ?? '',
                is_active: employee.is_active,
            });
        }
    }, [employee, reset]);

    const handleClose = () => {
        reset();
        onClose();
    };

    const onSubmit = (data: FormData) => {
        if (!employee) return;
        updateMutation.mutate({
            id: employee.id,
            data: {
                name: data.name.trim(),
                email: data.email?.trim() || null,
                is_active: data.is_active,
            },
        });
    };

    return (
        <Dialog open={!!employee} onClose={handleClose} maxWidth="sm" fullWidth>
            <DialogTitle>{cfl(getString('editEmployee') || 'Edit Employee')}</DialogTitle>
            <DialogContent>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, mt: 1 }}>
                    {updateMutation.isError && (
                        <Alert severity="error">{updateMutation.error?.message}</Alert>
                    )}

                    {/* Read-only context: code + job */}
                    {employee && (
                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
                            <Chip
                                label={employee.code}
                                size="small"
                                variant="outlined"
                                sx={{ fontFamily: 'monospace', fontWeight: 700 }}
                            />
                            {employee.job && (
                                <Chip
                                    label={employee.job.name}
                                    size="small"
                                    color="primary"
                                    variant="outlined"
                                />
                            )}
                            <Typography variant="caption" color="text.disabled">
                                {getString('jobChangeViaEvents') ||
                                    'Job changes are managed via employee events'}
                            </Typography>
                        </Box>
                    )}

                    <Divider />

                    <TextField
                        label={cfl(getString('name') || 'Name')}
                        required
                        fullWidth
                        slotProps={{ htmlInput: { maxLength: 100 } }}
                        error={!!errors.name}
                        helperText={
                            errors.name?.message &&
                            (getString(errors.name.message) || errors.name.message)
                        }
                        {...register('name')}
                    />

                    <TextField
                        label={cfl(getString('email') || 'Email')}
                        fullWidth
                        type="email"
                        slotProps={{ htmlInput: { maxLength: 100 } }}
                        error={!!errors.email}
                        helperText={
                            errors.email?.message &&
                            (getString(errors.email.message) || errors.email.message)
                        }
                        {...register('email')}
                    />

                    <FormControlLabel
                        control={
                            <Switch
                                checked={watch('is_active')}
                                onChange={(_, checked) => setValue('is_active', checked)}
                            />
                        }
                        label={cfl(getString('isActive') || 'Active')}
                    />
                </Box>
            </DialogContent>
            <DialogActions>
                <Button
                    variant="outlined"
                    onClick={handleClose}
                    disabled={updateMutation.isPending}
                >
                    {getString('cancel') || 'Cancel'}
                </Button>
                <Button
                    variant="contained"
                    onClick={handleSubmit(onSubmit)}
                    disabled={updateMutation.isPending}
                    startIcon={
                        updateMutation.isPending ? (
                            <CircularProgress size={16} color="inherit" />
                        ) : undefined
                    }
                >
                    {getString('save') || 'Save'}
                </Button>
            </DialogActions>
        </Dialog>
    );
}

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
import type { PersonUpdate } from '../admin/persons/personApi';
import useString from '../../hooks/useString';
import str from '../../strings/str';
import cfl from '../../utils/helpers.ts';

const schema = z.object({
    last_name: z.string().min(1, 'fieldRequired').max(64, 'nameTooLong'),
    first_name: z.string().min(1, 'fieldRequired').max(64, 'nameTooLong'),
    patronymic: z.string().max(64, 'nameTooLong').optional().or(z.literal('')),
    email: z.string().max(100).email('invalidEmail').optional().or(z.literal('')),
    is_active: z.boolean(),
});

type FormData = z.infer<typeof schema>;

interface Props {
    employee: Employee | null;
    onClose: () => void;
    updateMutation: UseMutationResult<
        Employee,
        Error,
        { id: number; data: EmployeeUpdate; personId?: number | null; personData?: PersonUpdate }
    >;
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
        defaultValues: {
            last_name: '',
            first_name: '',
            patronymic: '',
            email: '',
            is_active: true,
        },
    });

    // Populate form when employee changes (name fields come from the person).
    useEffect(() => {
        if (employee) {
            reset({
                last_name: employee.person?.last_name ?? '',
                first_name: employee.person?.first_name ?? '',
                patronymic: employee.person?.patronymic ?? '',
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
        // Name fields live on the person: patch it only when they actually
        // changed (the backend then rebuilds employees.name).
        const person = employee.person;
        const nameChanged =
            data.last_name.trim() !== (person?.last_name ?? '') ||
            data.first_name.trim() !== (person?.first_name ?? '') ||
            (data.patronymic?.trim() || '') !== (person?.patronymic ?? '');
        const personData: PersonUpdate | undefined =
            nameChanged && employee.person_id
                ? {
                      last_name: data.last_name.trim(),
                      first_name: data.first_name.trim(),
                      patronymic: data.patronymic?.trim() || null,
                      allow_duplicate: true, // rename of an existing person — no dead-end
                  }
                : undefined;

        updateMutation.mutate({
            id: employee.id,
            data: {
                email: data.email?.trim() || null,
                is_active: data.is_active,
            },
            personId: employee.person_id,
            personData,
        });
    };

    return (
        <Dialog open={!!employee} onClose={handleClose} maxWidth="sm" fullWidth>
            <DialogTitle>{cfl(getString('editEmployee') || 'Edit Employee card')}</DialogTitle>
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
                        label={cfl(getString('lastName') || 'Last name')}
                        required
                        fullWidth
                        slotProps={{ htmlInput: { maxLength: 64 } }}
                        error={!!errors.last_name}
                        helperText={
                            errors.last_name?.message &&
                            (getString(errors.last_name.message) || errors.last_name.message)
                        }
                        {...register('last_name')}
                    />

                    <TextField
                        label={cfl(getString('firstName') || 'First name')}
                        required
                        fullWidth
                        slotProps={{ htmlInput: { maxLength: 64 } }}
                        error={!!errors.first_name}
                        helperText={
                            errors.first_name?.message &&
                            (getString(errors.first_name.message) || errors.first_name.message)
                        }
                        {...register('first_name')}
                    />

                    <TextField
                        label={cfl(getString('patronymic') || 'Patronymic')}
                        fullWidth
                        slotProps={{ htmlInput: { maxLength: 64 } }}
                        error={!!errors.patronymic}
                        helperText={
                            errors.patronymic?.message &&
                            (getString(errors.patronymic.message) || errors.patronymic.message)
                        }
                        {...register('patronymic')}
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

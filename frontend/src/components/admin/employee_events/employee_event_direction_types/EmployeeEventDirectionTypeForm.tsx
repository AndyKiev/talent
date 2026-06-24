// src/components/admin/employee_events/employee_event_direction_types/EmployeeEventDirectionTypeForm.tsx
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
    EmployeeEventDirectionTypeCreate,
    MutationResponse,
    EmployeeEventDirectionType,
} from './employeeEventDirectionTypeApi';
import useString from '../../../../hooks/useString.ts';
import cfl from '../../../../utils/helpers.ts';
import str from '../../../../strings/str.ts';

const schema = z.object({
    code: z
        .string()
        .min(1, 'codeRequired')
        .max(64, 'codeTooLong')
        .regex(/^[A-Z0-9_]+$/, 'codeFormat'),
    name: z.string().min(1, 'nameRequired').max(128, 'nameTooLong'),
});

type FormData = z.infer<typeof schema>;

interface Props {
    open: boolean;
    onClose: () => void;
    createMutation: UseMutationResult<
        MutationResponse<EmployeeEventDirectionType>,
        Error,
        EmployeeEventDirectionTypeCreate
    >;
}

export function EmployeeEventDirectionTypeForm({ open, onClose, createMutation }: Props) {
    const getString = useString({ str });

    const {
        register,
        handleSubmit,
        formState: { errors },
        reset,
    } = useForm<FormData>({
        resolver: zodResolver(schema),
        defaultValues: { code: '', name: '' },
    });

    const handleClose = () => {
        reset();
        onClose();
    };

    const onSubmit = (data: FormData) => {
        createMutation.mutate({ code: data.code, name: data.name });
    };

    return (
        <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
            <DialogTitle>
                {cfl(getString('createEmployeeEventDirectionType')) || 'Create Employee Event Direction Type'}
            </DialogTitle>
            <DialogContent>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                    {createMutation.isError && (
                        <Alert severity="error">{createMutation.error?.message}</Alert>
                    )}
                    <TextField
                        label={cfl(getString('code')) || 'Code'}
                        fullWidth
                        slotProps={{ htmlInput: { maxLength: 64 } }}
                        error={!!errors.code}
                        helperText={
                            errors.code?.message &&
                            (getString(errors.code.message) || errors.code.message)
                        }
                        {...register('code')}
                    />
                    <TextField
                        label={cfl(getString('name')) || 'Name'}
                        fullWidth
                        slotProps={{ htmlInput: { maxLength: 128 } }}
                        error={!!errors.name}
                        helperText={
                            errors.name?.message &&
                            (getString(errors.name.message) || errors.name.message)
                        }
                        {...register('name')}
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
                    startIcon={
                        createMutation.isPending ? (
                            <CircularProgress size={16} color="inherit" />
                        ) : undefined
                    }
                >
                    {getString('create') || 'Create'}
                </Button>
            </DialogActions>
        </Dialog>
    );
}

// src/components/admin/reviewers/process_role_holder_employee_link/ProcessRoleHolderEmployeeLinkForm.tsx
import { useEffect } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod/v4';
import { useQuery } from '@tanstack/react-query';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Box,
    Alert,
    CircularProgress,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    FormHelperText,
} from '@mui/material';
import type { UseMutationResult } from '@tanstack/react-query';
import type {
    ProcessRoleHolderEmployeeLinkCreate,
    MutationResponse,
    ProcessRoleHolderEmployeeLink,
} from './processRoleHolderEmployeeLinkApi';
import { fetchProcessRoleHolders } from '../process_role_holder/processRoleHolderApi';
import { PROCESS_ROLE_HOLDER_QK } from '../../../../utils/queryKeys';
import { EmployeeAutocomplete } from '../../../ui/EmployeeAutocomplete';
import useString from '../../../../hooks/useString.ts';
import cfl from '../../../../utils/capitalizeFirstLetter.ts';

const schema = z.object({
    process_role_holder_id: z.number().int().positive('reviewerRequired'),
    employee_id: z.number().int().positive('employeeRequired'),
});

type FormData = z.infer<typeof schema>;

interface Props {
    open: boolean;
    onClose: () => void;
    defaultHolderId?: number | null;
    createMutation: UseMutationResult<
        MutationResponse<ProcessRoleHolderEmployeeLink>,
        Error,
        ProcessRoleHolderEmployeeLinkCreate
    >;
}

export function ProcessRoleHolderEmployeeLinkForm({ open, onClose, defaultHolderId, createMutation }: Props) {
    const getString = useString();

    const { data: holders = [] } = useQuery({
        queryKey: PROCESS_ROLE_HOLDER_QK,
        queryFn: () => fetchProcessRoleHolders(),
        staleTime: 2 * 60 * 1000,
        enabled: open,
    });

    const {
        handleSubmit,
        formState: { errors },
        reset,
        control,
        setValue,
    } = useForm<FormData>({
        resolver: zodResolver(schema),
        defaultValues: { process_role_holder_id: defaultHolderId ?? 0, employee_id: 0 },
    });

    // keep the holder in sync with the page-level reviewer filter when the dialog opens
    useEffect(() => {
        if (open) {
            reset({ process_role_holder_id: defaultHolderId ?? 0, employee_id: 0 });
        }
    }, [open, defaultHolderId, reset]);

    const handleClose = () => {
        reset();
        onClose();
    };

    const onSubmit = (data: FormData) => {
        createMutation.mutate({
            process_role_holder_id: data.process_role_holder_id,
            employee_id: data.employee_id,
        });
    };

    const holderId = useWatch({ control, name: 'process_role_holder_id' });
    const employeeId = useWatch({ control, name: 'employee_id' });

    return (
        <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
            <DialogTitle>{cfl(getString('assignEmployee')) || 'Assign Employee'}</DialogTitle>
            <DialogContent>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                    {createMutation.isError && (
                        <Alert severity="error">{createMutation.error?.message}</Alert>
                    )}
                    <FormControl fullWidth error={!!errors.process_role_holder_id} variant="outlined">
                        <InputLabel id="link-holder-label">{cfl(getString('reviewer')) || 'Reviewer'}</InputLabel>
                        <Select
                            labelId="link-holder-label"
                            variant="outlined"
                            label={cfl(getString('reviewer')) || 'Reviewer'}
                            value={holderId ? String(holderId) : ''}
                            onChange={(e) => setValue('process_role_holder_id', Number(e.target.value), { shouldValidate: true })}
                        >
                            {holders.map((h) => (
                                <MenuItem key={h.id} value={String(h.id)}>
                                    {h.role_name ? `${h.role_name}: ` : ''}{h.holder_name || h.holder_code || `#${h.id}`}
                                </MenuItem>
                            ))}
                        </Select>
                        {errors.process_role_holder_id?.message && (
                            <FormHelperText>
                                {getString(errors.process_role_holder_id.message) || errors.process_role_holder_id.message}
                            </FormHelperText>
                        )}
                    </FormControl>

                    <EmployeeAutocomplete
                        label={cfl(getString('employee')) || 'Employee'}
                        value={employeeId || null}
                        onChange={(id) => setValue('employee_id', id ?? 0, { shouldValidate: true })}
                        error={!!errors.employee_id}
                        helperText={
                            errors.employee_id?.message
                                ? (getString(errors.employee_id.message) || errors.employee_id.message)
                                : undefined
                        }
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

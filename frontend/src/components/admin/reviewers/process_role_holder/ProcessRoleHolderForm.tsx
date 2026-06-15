// src/components/admin/reviewers/process_role_holder/ProcessRoleHolderForm.tsx
import { useForm } from 'react-hook-form';
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
import type { ProcessRoleHolderCreate, MutationResponse, ProcessRoleHolder } from './processRoleHolderApi';
import { fetchProcessRoles } from '../../../developer/process_roles/process_role/processRoleApi';
import { PROCESS_ROLE_QK } from '../../../../utils/queryKeys';
import { EmployeeAutocomplete } from '../../../ui/EmployeeAutocomplete';
import useString from '../../../../hooks/useString.ts';
import cfl from '../../../../utils/capitalizeFirstLetter.ts';

const schema = z.object({
    process_role_id: z.number().int().positive('roleRequired'),
    holder_employee_id: z.number().int().positive('employeeRequired'),
});

type FormData = z.infer<typeof schema>;

interface Props {
    open: boolean;
    onClose: () => void;
    createMutation: UseMutationResult<MutationResponse<ProcessRoleHolder>, Error, ProcessRoleHolderCreate>;
}

export function ProcessRoleHolderForm({ open, onClose, createMutation }: Props) {
    const getString = useString();

    const { data: roles = [] } = useQuery({
        queryKey: PROCESS_ROLE_QK,
        queryFn: () => fetchProcessRoles(),
        staleTime: 2 * 60 * 1000,
        enabled: open,
    });

    const {
        handleSubmit,
        formState: { errors },
        reset,
        watch,
        setValue,
    } = useForm<FormData>({
        resolver: zodResolver(schema),
        defaultValues: { process_role_id: 0, holder_employee_id: 0 },
    });

    const handleClose = () => {
        reset();
        onClose();
    };

    const onSubmit = (data: FormData) => {
        createMutation.mutate({
            process_role_id: data.process_role_id,
            holder_employee_id: data.holder_employee_id,
        });
    };

    const roleId = watch('process_role_id');
    const employeeId = watch('holder_employee_id');

    return (
        <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
            <DialogTitle>{cfl(getString('addReviewer')) || 'Add Reviewer'}</DialogTitle>
            <DialogContent>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                    {createMutation.isError && (
                        <Alert severity="error">{createMutation.error?.message}</Alert>
                    )}
                    <FormControl fullWidth error={!!errors.process_role_id} variant="outlined">
                        <InputLabel id="holder-role-label">{cfl(getString('role')) || 'Role'}</InputLabel>
                        <Select
                            labelId="holder-role-label"
                            variant="outlined"
                            label={cfl(getString('role')) || 'Role'}
                            value={roleId ? String(roleId) : ''}
                            onChange={(e) => setValue('process_role_id', Number(e.target.value), { shouldValidate: true })}
                        >
                            {roles.map((r) => (
                                <MenuItem key={r.id} value={String(r.id)}>
                                    {r.process_name ? `${r.process_name} / ` : ''}{r.name}
                                </MenuItem>
                            ))}
                        </Select>
                        {errors.process_role_id?.message && (
                            <FormHelperText>
                                {getString(errors.process_role_id.message) || errors.process_role_id.message}
                            </FormHelperText>
                        )}
                    </FormControl>

                    <EmployeeAutocomplete
                        label={cfl(getString('reviewer')) || 'Reviewer'}
                        value={employeeId || null}
                        onChange={(id) => setValue('holder_employee_id', id ?? 0, { shouldValidate: true })}
                        error={!!errors.holder_employee_id}
                        helperText={
                            errors.holder_employee_id?.message
                                ? (getString(errors.holder_employee_id.message) || errors.holder_employee_id.message)
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

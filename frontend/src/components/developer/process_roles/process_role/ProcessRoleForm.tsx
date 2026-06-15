// src/components/developer/process_roles/process_role/ProcessRoleForm.tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod/v4';
import { useQuery } from '@tanstack/react-query';
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
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    FormHelperText,
} from '@mui/material';
import type { UseMutationResult } from '@tanstack/react-query';
import type { ProcessRoleCreate, MutationResponse, ProcessRole } from './processRoleApi';
import { fetchProcesses } from '../process/processApi';
import { PROCESS_QK } from '../../../../utils/queryKeys';
import useString from '../../../../hooks/useString.ts';
import cfl from '../../../../utils/capitalizeFirstLetter.ts';

const schema = z.object({
    process_id: z.number().int().positive('processRequired'),
    name: z.string().min(1, 'nameRequired').max(128, 'nameTooLong'),
    key: z.string().max(64, 'keyTooLong').optional().or(z.literal('')),
    is_active: z.boolean(),
    link_target: z.enum(['employee', 'department']),
});

type FormData = z.infer<typeof schema>;

interface Props {
    open: boolean;
    onClose: () => void;
    createMutation: UseMutationResult<MutationResponse<ProcessRole>, Error, ProcessRoleCreate>;
}

export function ProcessRoleForm({ open, onClose, createMutation }: Props) {
    const getString = useString();

    const { data: processes = [] } = useQuery({
        queryKey: PROCESS_QK,
        queryFn: () => fetchProcesses(),
        staleTime: 2 * 60 * 1000,
        enabled: open,
    });

    const {
        register,
        handleSubmit,
        formState: { errors },
        reset,
        watch,
        setValue,
    } = useForm<FormData>({
        resolver: zodResolver(schema),
        defaultValues: { process_id: 0, name: '', key: '', is_active: true, link_target: 'employee' },
    });

    const handleClose = () => {
        reset();
        onClose();
    };

    const onSubmit = (data: FormData) => {
        createMutation.mutate({
            process_id: data.process_id,
            name: data.name,
            key: data.key || null,
            is_active: data.is_active,
            link_target: data.link_target,
        });
    };

    const processId = watch('process_id');
    const linkTarget = watch('link_target');

    return (
        <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
            <DialogTitle>{cfl(getString('createProcessRole')) || 'Create Role'}</DialogTitle>
            <DialogContent>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                    {createMutation.isError && (
                        <Alert severity="error">{createMutation.error?.message}</Alert>
                    )}
                    <FormControl fullWidth error={!!errors.process_id} variant="outlined">
                        <InputLabel id="process-role-process-label">
                            {cfl(getString('process')) || 'Process'}
                        </InputLabel>
                        <Select
                            labelId="process-role-process-label"
                            variant="outlined"
                            label={cfl(getString('process')) || 'Process'}
                            value={processId ? String(processId) : ''}
                            onChange={(e) => setValue('process_id', Number(e.target.value), { shouldValidate: true })}
                        >
                            {processes.map((p) => (
                                <MenuItem key={p.id} value={String(p.id)}>
                                    {p.name}{p.key ? ` (${p.key})` : ''}
                                </MenuItem>
                            ))}
                        </Select>
                        {errors.process_id?.message && (
                            <FormHelperText>
                                {getString(errors.process_id.message) || errors.process_id.message}
                            </FormHelperText>
                        )}
                    </FormControl>
                    <TextField
                        label={cfl(getString('name')) || 'Name'}
                        fullWidth
                        slotProps={{ htmlInput: { maxLength: 128 } }}
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
                    <FormControl fullWidth variant="outlined">
                        <InputLabel id="process-role-link-target-label">
                            {cfl(getString('linkTarget')) || 'Links to'}
                        </InputLabel>
                        <Select
                            labelId="process-role-link-target-label"
                            variant="outlined"
                            label={cfl(getString('linkTarget')) || 'Links to'}
                            value={linkTarget}
                            onChange={(e) => setValue('link_target', e.target.value as 'employee' | 'department')}
                        >
                            <MenuItem value="employee">{getString('linkTargetEmployee') || 'Employees'}</MenuItem>
                            <MenuItem value="department">{getString('linkTargetDepartment') || 'Departments'}</MenuItem>
                        </Select>
                    </FormControl>
                    <FormControlLabel
                        control={
                            <Switch
                                checked={watch('is_active')}
                                onChange={(_, checked) => setValue('is_active', checked)}
                            />
                        }
                        label={cfl(getString('isActive')) || 'Active'}
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

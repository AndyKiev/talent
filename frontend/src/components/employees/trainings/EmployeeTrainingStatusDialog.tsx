// src/components/employees/trainings/EmployeeTrainingStatusDialog.tsx
import { useState } from 'react';
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
} from '@mui/material';
import type { UseMutationResult } from '@tanstack/react-query';
import type { EmployeeTrainingStatus } from '../../training/employee_training_statuses/employeeTrainingStatusApi';
import type { EmployeeTraining, EmployeeTrainingUpdate, MutationResponse } from './employeeTrainingApi';
import useString from '../../../hooks/useString';
import cfl, { snakeToCamel } from '../../../utils/helpers.ts';
import str from '../../../strings/str';

interface Props {
    open: boolean;
    employeeTraining: EmployeeTraining | null;
    trainingStatuses: EmployeeTrainingStatus[];
    updateMutation: UseMutationResult<MutationResponse<EmployeeTraining>, Error, { id: number; data: EmployeeTrainingUpdate }>;
    onClose: () => void;
}

export function EmployeeTrainingStatusDialog({
    open,
    employeeTraining,
    trainingStatuses,
    updateMutation,
    onClose,
}: Props) {
    const getString = useString({ str });
    const [statusId, setStatusId] = useState<number>(0);
    const [lastSeenId, setLastSeenId] = useState<number | null>(null);

    if (employeeTraining && employeeTraining.id !== lastSeenId) {
        setLastSeenId(employeeTraining.id);
        setStatusId(employeeTraining.training_status_id);
    }

    const handleSubmit = () => {
        if (!employeeTraining || !statusId) return;
        updateMutation.mutate({ id: employeeTraining.id, data: { training_status_id: statusId } });
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
            <DialogTitle>{cfl(getString('changeTrainingStatus')) || 'Change Training Status'}</DialogTitle>
            <DialogContent>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                    {updateMutation.isError && (
                        <Alert severity="error">{updateMutation.error?.message}</Alert>
                    )}
                    <FormControl fullWidth>
                        <InputLabel>{cfl(getString('status')) || 'Status'}</InputLabel>
                        <Select
                            variant="outlined"
                            label={cfl(getString('status')) || 'Status'}
                            value={statusId || ''}
                            onChange={(e) => setStatusId(Number(e.target.value))}
                        >
                            {trainingStatuses.map((s) => {
                                const statusKey = `trainingStatus${cfl(snakeToCamel(s.key))}`;
                                const translated = getString(statusKey);
                                return (
                                    <MenuItem key={s.id} value={s.id}>
                                        {translated === statusKey ? cfl(s.key) : cfl(translated)}
                                    </MenuItem>
                                );
                            })}
                        </Select>
                    </FormControl>
                </Box>
            </DialogContent>
            <DialogActions>
                <Button variant="outlined" onClick={onClose} disabled={updateMutation.isPending}>
                    {getString('cancel') || 'Cancel'}
                </Button>
                <Button
                    variant="contained"
                    onClick={handleSubmit}
                    disabled={!statusId || updateMutation.isPending}
                    startIcon={updateMutation.isPending ? <CircularProgress size={16} color="inherit" /> : undefined}
                >
                    {getString('save') || 'Save'}
                </Button>
            </DialogActions>
        </Dialog>
    );
}

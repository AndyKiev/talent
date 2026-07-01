// src/components/employees/trainings/AssignTrainingDialog.tsx
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
    FormHelperText,
} from '@mui/material';
import type { UseMutationResult } from '@tanstack/react-query';
import type { TrainingType } from '../../training/training_types/trainingTypeApi';
import type { EmployeeTrainingStatus } from '../../training/employee_training_statuses/employeeTrainingStatusApi';
import type { EmployeeTrainingCreate, MutationResponse, EmployeeTraining } from './employeeTrainingApi';
import useString from '../../../hooks/useString';
import cfl, { snakeToCamel } from '../../../utils/helpers.ts';
import str from '../../../strings/str';

interface Props {
    open: boolean;
    onClose: () => void;
    employeeId: number;
    availableTrainingTypes: TrainingType[];
    trainingStatuses: EmployeeTrainingStatus[];
    createMutation: UseMutationResult<MutationResponse<EmployeeTraining>, Error, EmployeeTrainingCreate>;
}

export function AssignTrainingDialog({
    open,
    onClose,
    employeeId,
    availableTrainingTypes,
    trainingStatuses,
    createMutation,
}: Props) {
    const getString = useString({ str });
    const [trainingTypeId, setTrainingTypeId] = useState<number>(0);
    const [trainingStatusId, setTrainingStatusId] = useState<number>(0);

    const handleClose = () => {
        setTrainingTypeId(0);
        setTrainingStatusId(0);
        onClose();
    };

    const handleSubmit = () => {
        if (!trainingTypeId || !trainingStatusId) return;
        createMutation.mutate({
            employee_id: employeeId,
            training_type_id: trainingTypeId,
            training_status_id: trainingStatusId,
        });
    };

    const canSubmit = !!trainingTypeId && !!trainingStatusId;

    return (
        <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
            <DialogTitle>{cfl(getString('assignTraining')) || 'Assign Training'}</DialogTitle>
            <DialogContent>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                    {createMutation.isError && (
                        <Alert severity="error">{createMutation.error?.message}</Alert>
                    )}
                    <FormControl fullWidth>
                        <InputLabel>{cfl(getString('trainingType')) || 'Training'}</InputLabel>
                        <Select
                            variant="outlined"
                            label={cfl(getString('trainingType')) || 'Training'}
                            value={trainingTypeId || ''}
                            onChange={(e) => setTrainingTypeId(Number(e.target.value))}
                        >
                            {availableTrainingTypes.map((t) => (
                                <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>
                            ))}
                        </Select>
                        {availableTrainingTypes.length === 0 && (
                            <FormHelperText>
                                {getString('noAvailableTrainingTypes') || 'No training types available'}
                            </FormHelperText>
                        )}
                    </FormControl>
                    <FormControl fullWidth>
                        <InputLabel>{cfl(getString('status')) || 'Status'}</InputLabel>
                        <Select
                            variant="outlined"
                            label={cfl(getString('status')) || 'Status'}
                            value={trainingStatusId || ''}
                            onChange={(e) => setTrainingStatusId(Number(e.target.value))}
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
                <Button variant="outlined" onClick={handleClose} disabled={createMutation.isPending}>
                    {getString('cancel') || 'Cancel'}
                </Button>
                <Button
                    variant="contained"
                    onClick={handleSubmit}
                    disabled={!canSubmit || createMutation.isPending}
                    startIcon={createMutation.isPending ? <CircularProgress size={16} color="inherit" /> : undefined}
                >
                    {getString('assign') || 'Assign'}
                </Button>
            </DialogActions>
        </Dialog>
    );
}

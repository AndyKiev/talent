// src/components/training/employee_training_statuses/EmployeeTrainingStatusDeleteDialog.tsx
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Typography,
    CircularProgress,
} from '@mui/material';
import type { EmployeeTrainingStatus } from './employeeTrainingStatusApi';
import useString from '../../../hooks/useString';
import str from '../../../strings/str';

interface Props {
    row: EmployeeTrainingStatus | null;
    isPending: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}

export function EmployeeTrainingStatusDeleteDialog({ row, isPending, onConfirm, onCancel }: Props) {
    const getString = useString({ str });

    return (
        <Dialog open={!!row} onClose={onCancel} maxWidth="xs" fullWidth>
            <DialogTitle>{getString('deleteEmployeeTrainingStatus') || 'Delete Employee Training Status'}</DialogTitle>
            <DialogContent>
                <Typography variant="body2">
                    {getString('areYouSureDeleteEmployeeTrainingStatus') ||
                        `Are you sure you want to delete "${row?.key}"? This action cannot be undone.`}
                </Typography>
            </DialogContent>
            <DialogActions>
                <Button variant="outlined" onClick={onCancel} disabled={isPending}>
                    {getString('cancel') || 'Cancel'}
                </Button>
                <Button
                    variant="contained"
                    color="error"
                    onClick={onConfirm}
                    disabled={isPending}
                    startIcon={isPending ? <CircularProgress size={16} color="inherit" /> : undefined}
                >
                    {getString('delete') || 'Delete'}
                </Button>
            </DialogActions>
        </Dialog>
    );
}

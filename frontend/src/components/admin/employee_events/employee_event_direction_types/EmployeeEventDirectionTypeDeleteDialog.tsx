// src/components/admin/employee_events/employee_event_direction_types/EmployeeEventDirectionTypeDeleteDialog.tsx
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Typography,
    CircularProgress,
} from '@mui/material';
import type { EmployeeEventDirectionType } from './employeeEventDirectionTypeApi';
import useString from '../../../../hooks/useString';
import str from '../../../../strings/str';

interface Props {
    row: EmployeeEventDirectionType | null;
    isPending: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}

export function EmployeeEventDirectionTypeDeleteDialog({
    row,
    isPending,
    onConfirm,
    onCancel,
}: Props) {
    const getString = useString({ str });

    return (
        <Dialog open={!!row} onClose={onCancel} maxWidth="xs" fullWidth>
            <DialogTitle>
                {getString('deleteEmployeeEventDirectionType') || 'Delete Employee Event Direction Type'}
            </DialogTitle>
            <DialogContent>
                <Typography variant="body2">
                    {getString('areYouSureDeleteEmployeeEventDirectionType') ||
                        `Are you sure you want to delete "${row?.name}" (${row?.code})? This action cannot be undone.`}
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
                    startIcon={
                        isPending ? <CircularProgress size={16} color="inherit" /> : undefined
                    }
                >
                    {getString('delete') || 'Delete'}
                </Button>
            </DialogActions>
        </Dialog>
    );
}

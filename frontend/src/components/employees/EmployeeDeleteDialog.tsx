// src/components/employees/EmployeeDeleteDialog.tsx
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Typography,
    CircularProgress,
    Chip,
    Box,
} from '@mui/material';
import type { Employee } from './employeeApi';
import useString from '../../hooks/useString';
import str from '../../strings/str';
import cfl from '../../utils/helpers.ts';

interface Props {
    employee: Employee | null;
    isPending: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}

export function EmployeeDeleteDialog({ employee, isPending, onConfirm, onCancel }: Props) {
    const getString = useString({ str });

    return (
        <Dialog open={!!employee} onClose={onCancel} maxWidth="xs" fullWidth>
            <DialogTitle>{cfl(getString('deleteEmployee') || 'Delete Employee')}</DialogTitle>
            <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <Typography variant="body2">
                    {getString('areYouSureDeleteEmployee') ||
                        'Are you sure you want to delete this employee? This action cannot be undone.'}
                </Typography>
                {employee && (
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                        <Chip
                            label={employee.code}
                            size="small"
                            variant="outlined"
                            sx={{ fontFamily: 'monospace', fontWeight: 700 }}
                        />
                        <Chip label={employee.name} size="small" variant="outlined" />
                    </Box>
                )}
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

// src/components/employees/EmployeeDeleteDialog.tsx
import { useEffect, useState } from 'react';
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
    Checkbox,
    FormControlLabel,
} from '@mui/material';
import type { Employee } from './employeeApi';
import useString from '../../hooks/useString';
import str from '../../strings/str';
import cfl from '../../utils/helpers.ts';

interface Props {
    employee: Employee | null;
    isPending: boolean;
    /** Dev/superadmin only: shows the "also delete related records" option. */
    isDev?: boolean;
    onConfirm: (force: boolean) => void;
    onCancel: () => void;
}

export function EmployeeDeleteDialog({ employee, isPending, isDev, onConfirm, onCancel }: Props) {
    const getString = useString({ str });
    const [force, setForce] = useState(false);

    // Reset the force option whenever the dialog (re)opens for an employee.
    useEffect(() => {
        if (employee) setForce(false);
    }, [employee]);

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
                {isDev && (
                    <FormControlLabel
                        control={
                            <Checkbox
                                size="small"
                                checked={force}
                                onChange={(e) => setForce(e.target.checked)}
                            />
                        }
                        label={
                            getString('forceDeleteRelated') ||
                            'Also delete related records (events, department links)'
                        }
                    />
                )}
            </DialogContent>
            <DialogActions>
                <Button variant="outlined" onClick={onCancel} disabled={isPending}>
                    {getString('cancel') || 'Cancel'}
                </Button>
                <Button
                    variant="contained"
                    color="error"
                    onClick={() => onConfirm(force)}
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

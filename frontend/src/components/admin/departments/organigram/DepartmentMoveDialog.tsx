// src/components/admin/departments/organigram/DepartmentMoveDialog.tsx
//
// Confirm re-parenting a department. Before the user confirms, the BACKEND
// says whether the move keeps the department-type structure
// (GET /departments/{id}/move_check) — a mismatch is only a warning: an
// instance may deviate from its type structure.
import { useQuery } from '@tanstack/react-query';
import {
    Alert,
    Button,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Typography,
} from '@mui/material';
import { checkDepartmentMove, type DepartmentNode } from '../departmentApi';
import { DEPARTMENT_MOVE_CHECK_QK } from '../../../../utils/queryKeys';
import type { GetStringFn } from '../../../../types/getStringFn';

interface Props {
    dept: DepartmentNode;
    from: string;
    to: DepartmentNode;
    isPending: boolean;
    onConfirm: () => void;
    onClose: () => void;
    getString: GetStringFn;
}

export function DepartmentMoveDialog({ dept, from, to, isPending, onConfirm, onClose, getString }: Props) {
    const check = useQuery({
        queryKey: DEPARTMENT_MOVE_CHECK_QK(dept.id, to.id),
        queryFn: () => checkDepartmentMove(dept.id, to.id),
    });

    return (
        <Dialog open onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>{getString('deptOrgMoveTitle')}</DialogTitle>
            <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <Typography variant="body2">
                    {getString('deptOrgMoveMsg', { child: dept.name, from, to: to.name })}
                </Typography>
                {check.isLoading ? (
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', gap: 1 }}>
                        <CircularProgress size={14} />
                        {getString('deptOrgMoveChecking')}
                    </Typography>
                ) : check.error ? (
                    <Alert severity="error">{(check.error as Error).message}</Alert>
                ) : check.data?.matches_type_structure ? (
                    <Alert severity="success">{getString('deptOrgMoveMatches')}</Alert>
                ) : (
                    <Alert severity="warning">
                        {getString('deptOrgMoveDeviates', { child: dept.name, to: to.name })}
                    </Alert>
                )}
            </DialogContent>
            <DialogActions>
                <Button variant="outlined" onClick={onClose} disabled={isPending}>
                    {getString('cancel')}
                </Button>
                <Button
                    variant="contained"
                    color={check.data && !check.data.matches_type_structure ? 'warning' : 'primary'}
                    onClick={onConfirm}
                    disabled={isPending || check.isLoading}
                    startIcon={isPending ? <CircularProgress size={16} color="inherit" /> : undefined}
                >
                    {getString('deptTypeOrgActionMove')}
                </Button>
            </DialogActions>
        </Dialog>
    );
}

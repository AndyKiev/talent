// src/components/admin/reviewers/process_role_holder_employee_link/EmployeeAssignmentPanel.tsx
import { useCallback, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Alert, Box, Button, CircularProgress, Paper, Snackbar, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { DataGrid } from '@mui/x-data-grid';
import {
    fetchProcessRoleHolderEmployeeLinks,
    type ProcessRoleHolderEmployeeLink,
} from './processRoleHolderEmployeeLinkApi';
import { PROCESS_ROLE_HOLDER_EMPLOYEE_QK } from '../../../../utils/queryKeys';
import { useProcessRoleHolderEmployeeLinkMutations } from './useProcessRoleHolderEmployeeLinkMutations';
import { useProcessRoleHolderEmployeeLinkColumns } from './useProcessRoleHolderEmployeeLinkColumns';
import { ProcessRoleHolderEmployeeLinkForm } from './ProcessRoleHolderEmployeeLinkForm';
import { ProcessRoleHolderEmployeeLinkDeleteDialog } from './ProcessRoleHolderEmployeeLinkDeleteDialog';
import { useDataGridLocale } from '../../../../hooks/useDataGridLocale';
import useString from '../../../../hooks/useString';
import cfl from '../../../../utils/capitalizeFirstLetter';

export function EmployeeAssignmentPanel({ holderId }: { holderId: number }) {
    const getString = useString();
    const localeText = useDataGridLocale();

    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
    const [formOpen, setFormOpen] = useState(false);
    const [rowToDelete, setRowToDelete] = useState<ProcessRoleHolderEmployeeLink | null>(null);
    const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 10 });

    const { data: rows = [], isLoading, error } = useQuery({
        queryKey: [...PROCESS_ROLE_HOLDER_EMPLOYEE_QK, holderId],
        queryFn: () => fetchProcessRoleHolderEmployeeLinks({ process_role_holder_id: holderId }),
        staleTime: 2 * 60 * 1000,
    });

    const { createMutation, deleteMutation } = useProcessRoleHolderEmployeeLinkMutations({
        setSnackbar,
        onCreateSuccess: () => setFormOpen(false),
        onDeleteSuccess: () => setRowToDelete(null),
        onDeleteError: () => setRowToDelete(null),
    });

    const handleDeleteClick = useCallback((row: ProcessRoleHolderEmployeeLink) => setRowToDelete(row), []);
    const handleConfirmDelete = useCallback(() => { if (rowToDelete) deleteMutation.mutate(rowToDelete.id); }, [rowToDelete, deleteMutation]);
    const columns = useProcessRoleHolderEmployeeLinkColumns({ getString, onDeleteClick: handleDeleteClick, deleteIsPending: deleteMutation.isPending });

    return (
        <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <Typography variant="subtitle1" fontWeight={600} sx={{ flex: 1 }}>
                    {getString('assignedEmployees') || 'Assigned employees'}
                </Typography>
                <Button variant="contained" size="medium" startIcon={<AddIcon />} onClick={() => setFormOpen(true)}>
                    {cfl(getString('assignEmployee')) || 'Assign'}
                </Button>
            </Box>

            {isLoading && <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>}
            {!isLoading && error && <Alert severity="error" sx={{ m: 2 }}>{(error as Error).message}</Alert>}
            {!isLoading && !error && (
                <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
                    <DataGrid
                        rows={rows} columns={columns}
                        paginationModel={paginationModel} onPaginationModelChange={setPaginationModel}
                        pageSizeOptions={[5, 10, 25, 50]} disableRowSelectionOnClick getRowId={(r) => r.id}
                        getRowHeight={() => 'auto'} localeText={localeText} hideFooterSelectedRowCount
                        sx={{ '& .MuiDataGrid-cell': { alignItems: 'center', py: 1 } }}
                    />
                </Paper>
            )}

            <ProcessRoleHolderEmployeeLinkForm
                open={formOpen} onClose={() => setFormOpen(false)} defaultHolderId={holderId} createMutation={createMutation}
            />
            <ProcessRoleHolderEmployeeLinkDeleteDialog
                row={rowToDelete} isPending={deleteMutation.isPending} onConfirm={handleConfirmDelete} onCancel={() => setRowToDelete(null)}
            />

            <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={() => setSnackbar((p) => ({ ...p, open: false }))} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
                <Alert severity={snackbar.severity} onClose={() => setSnackbar((p) => ({ ...p, open: false }))} sx={{ width: '100%' }}>{snackbar.message}</Alert>
            </Snackbar>
        </Box>
    );
}

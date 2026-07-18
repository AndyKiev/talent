// src/components/admin/reviewers/process_role_holder_employee_link/EmployeeAssignmentPanel.tsx
import { useCallback, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    Alert, Box, Button, Chip, CircularProgress, FormControlLabel,
    Paper, Snackbar, Stack, Switch, Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { DataGrid } from '@mui/x-data-grid';
import {
    fetchProcessRoleHolderEmployeeLinks,
    reorderProcessRoleHolderEmployeeLinks,
    type ProcessRoleHolderEmployeeLink,
} from './processRoleHolderEmployeeLinkApi';
import { ReorderableList } from '../../../people-review/ReorderableList';
import { PROCESS_ROLE_HOLDER_EMPLOYEE_QK } from '../../../../utils/queryKeys';
import { useProcessRoleHolderEmployeeLinkMutations } from './useProcessRoleHolderEmployeeLinkMutations';
import { useProcessRoleHolderEmployeeLinkColumns } from './useProcessRoleHolderEmployeeLinkColumns';
import { ProcessRoleHolderEmployeeLinkForm } from './ProcessRoleHolderEmployeeLinkForm';
import { useDataGridLocale } from '../../../../hooks/useDataGridLocale';
import useString from '../../../../hooks/useString';
import cfl from '../../../../utils/capitalizeFirstLetter';
import ConfirmDeleteDialog from '../../../ui/ConfirmDeleteDialog';

export function EmployeeAssignmentPanel({ holderId }: { holderId: number }) {
    const getString = useString();
    const localeText = useDataGridLocale();
    const qc = useQueryClient();

    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
    const [formOpen, setFormOpen] = useState(false);
    const [rowToDelete, setRowToDelete] = useState<ProcessRoleHolderEmployeeLink | null>(null);
    const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 10 });
    // Roster reorder mode (local UI; only the order persists server-side).
    const [reorderMode, setReorderMode] = useState(false);

    const linksQk = [...PROCESS_ROLE_HOLDER_EMPLOYEE_QK, holderId];
    const { data: rows = [], isLoading, error } = useQuery({
        queryKey: linksQk,
        queryFn: () => fetchProcessRoleHolderEmployeeLinks({ process_role_holder_id: holderId }),
        staleTime: 2 * 60 * 1000,
    });

    const reorderMutation = useMutation({
        mutationFn: (orderedIds: number[]) =>
            reorderProcessRoleHolderEmployeeLinks(holderId, orderedIds),
        onSuccess: async (res) => {
            await qc.invalidateQueries({ queryKey: linksQk });
            setSnackbar({ open: true, message: res.detail, severity: 'success' });
        },
        onError: (err: Error) => setSnackbar({ open: true, message: err.message, severity: 'error' }),
    });

    const { createMutation, deleteMutation } = useProcessRoleHolderEmployeeLinkMutations({
        setSnackbar,
        onCreateSuccess: () => setFormOpen(false),
        onDeleteSuccess: () => setRowToDelete(null),
        onDeleteError: () => setRowToDelete(null),
    });

    const handleDeleteClick = useCallback((row: ProcessRoleHolderEmployeeLink) => setRowToDelete(row), []);
    const handleConfirmDelete = useCallback(() => { if (rowToDelete) deleteMutation.mutate(rowToDelete.id); }, [rowToDelete, deleteMutation]);
    const deleteWho = rowToDelete?.employee_name || rowToDelete?.employee_code || '';
    const columns = useProcessRoleHolderEmployeeLinkColumns({ getString, onDeleteClick: handleDeleteClick, deleteIsPending: deleteMutation.isPending });

    return (
        <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <Typography variant="subtitle1" fontWeight={600} sx={{ flex: 1 }}>
                    {getString('assignedEmployees') || 'Assigned employees'}
                </Typography>
                {rows.length > 1 && (
                    <FormControlLabel
                        control={<Switch size="small" checked={reorderMode} onChange={(_, v) => setReorderMode(v)} />}
                        label={getString('reorderQueue')}
                        sx={{ ml: 0, mr: 0, '& .MuiFormControlLabel-label': { fontSize: 13, fontWeight: 600 } }}
                    />
                )}
                <Button variant="contained" size="medium" startIcon={<AddIcon />} onClick={() => setFormOpen(true)}>
                    {cfl(getString('assignEmployee')) || 'Assign'}
                </Button>
            </Box>

            {isLoading && <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>}
            {!isLoading && error && <Alert severity="error" sx={{ m: 2 }}>{(error as Error).message}</Alert>}
            {!isLoading && !error && (
                reorderMode ? (
                    <ReorderableList<ProcessRoleHolderEmployeeLink>
                        rows={rows}
                        getRowId={(r) => r.id}
                        getString={getString}
                        onReorder={(ids) => reorderMutation.mutate(ids)}
                        renderRow={(r) => (
                            <Stack direction="row" alignItems="center" spacing={1.5}>
                                <Typography fontSize={13} fontWeight={600} color="text.secondary" sx={{ minWidth: 64 }}>
                                    {r.employee_code || ''}
                                </Typography>
                                <Typography fontSize={13} sx={{ flex: 1 }}>{r.employee_name || `#${r.employee_id}`}</Typography>
                                {r.order_position == null && (
                                    <Chip label={getString('unordered')} size="small" variant="outlined" />
                                )}
                            </Stack>
                        )}
                    />
                ) : (
                    <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
                        <DataGrid
                            rows={rows} columns={columns}
                            paginationModel={paginationModel} onPaginationModelChange={setPaginationModel}
                            pageSizeOptions={[5, 10, 25, 50]} disableRowSelectionOnClick getRowId={(r) => r.id}
                            getRowHeight={() => 'auto'} localeText={localeText} hideFooterSelectedRowCount
                            sx={{ '& .MuiDataGrid-cell': { alignItems: 'center', py: 1 } }}
                        />
                    </Paper>
                )
            )}

            <ProcessRoleHolderEmployeeLinkForm
                open={formOpen} onClose={() => setFormOpen(false)} defaultHolderId={holderId} createMutation={createMutation}
            />
            <ConfirmDeleteDialog
                open={!!rowToDelete}
                title={getString('removeAssignment') || 'Remove Assignment'}
                message={getString('areYouSureRemoveAssignment', { employee: deleteWho }) || `Remove employee "${deleteWho}" from this reviewer?`}
                isDeleting={deleteMutation.isPending}
                onConfirm={handleConfirmDelete}
                onClose={() => setRowToDelete(null)}
            />

            <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={() => setSnackbar((p) => ({ ...p, open: false }))} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
                <Alert severity={snackbar.severity} onClose={() => setSnackbar((p) => ({ ...p, open: false }))} sx={{ width: '100%' }}>{snackbar.message}</Alert>
            </Snackbar>
        </Box>
    );
}

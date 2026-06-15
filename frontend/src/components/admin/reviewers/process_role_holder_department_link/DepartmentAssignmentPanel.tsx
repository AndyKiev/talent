// src/components/admin/reviewers/process_role_holder_department_link/DepartmentAssignmentPanel.tsx
import { useCallback, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
    Alert, Autocomplete, Box, Button, CircularProgress, Dialog, DialogActions,
    DialogContent, DialogTitle, Paper, Snackbar, TextField, Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { DataGrid } from '@mui/x-data-grid';
import {
    fetchProcessRoleHolderDepartmentLinks,
    type ProcessRoleHolderDepartmentLink,
} from './processRoleHolderDepartmentLinkApi';
import { PROCESS_ROLE_HOLDER_DEPARTMENT_QK } from '../../../../utils/queryKeys';
import { useProcessRoleHolderDepartmentLinkMutations } from './useProcessRoleHolderDepartmentLinkMutations';
import { useProcessRoleHolderDepartmentLinkColumns } from './useProcessRoleHolderDepartmentLinkColumns';
import { fetchDepartmentsFlat, type DepartmentFlat } from '../../departments/departmentApi';
import { fetchDepartmentCategories } from '../../department_categories/departmentCategoryApi';
import { useDataGridLocale } from '../../../../hooks/useDataGridLocale';
import useString from '../../../../hooks/useString';
import cfl from '../../../../utils/capitalizeFirstLetter';

const SUPERVISION_CATEGORY_KEYS = ['store', 'directorate'];

export function DepartmentAssignmentPanel({ holderId }: { holderId: number }) {
    const getString = useString();
    const localeText = useDataGridLocale();

    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
    const [formOpen, setFormOpen] = useState(false);
    const [pickedDept, setPickedDept] = useState<DepartmentFlat | null>(null);
    const [rowToDelete, setRowToDelete] = useState<ProcessRoleHolderDepartmentLink | null>(null);
    const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 10 });

    const { data: rows = [], isLoading, error } = useQuery({
        queryKey: [...PROCESS_ROLE_HOLDER_DEPARTMENT_QK, holderId],
        queryFn: () => fetchProcessRoleHolderDepartmentLinks({ process_role_holder_id: holderId }),
        staleTime: 2 * 60 * 1000,
    });

    // departments of categories store / directorate (ids resolved from keys, not hardcoded)
    const { data: cats = [] } = useQuery({ queryKey: ['department_categories'], queryFn: () => fetchDepartmentCategories(), staleTime: 5 * 60 * 1000 });
    const { data: allDepts = [] } = useQuery({ queryKey: ['departments_flat'], queryFn: fetchDepartmentsFlat, staleTime: 5 * 60 * 1000, enabled: formOpen });
    const allowedCatIds = useMemo(
        () => new Set(cats.filter((c) => c.key && SUPERVISION_CATEGORY_KEYS.includes(c.key)).map((c) => c.id)),
        [cats],
    );
    const deptOptions = useMemo(
        () => allDepts.filter((d) => allowedCatIds.has(d.department_category_id)),
        [allDepts, allowedCatIds],
    );

    const { createMutation, deleteMutation } = useProcessRoleHolderDepartmentLinkMutations({
        setSnackbar,
        onCreateSuccess: () => { setFormOpen(false); setPickedDept(null); },
        onDeleteSuccess: () => setRowToDelete(null),
        onDeleteError: () => setRowToDelete(null),
    });

    const handleDeleteClick = useCallback((row: ProcessRoleHolderDepartmentLink) => setRowToDelete(row), []);
    const columns = useProcessRoleHolderDepartmentLinkColumns({ getString, onDeleteClick: handleDeleteClick, deleteIsPending: deleteMutation.isPending });

    return (
        <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <Typography variant="subtitle1" fontWeight={600} sx={{ flex: 1 }}>
                    {getString('supervisorDepartments') || 'Supervised departments'}
                </Typography>
                <Button variant="contained" size="medium" startIcon={<AddIcon />} onClick={() => setFormOpen(true)}>
                    {cfl(getString('assignDepartment')) || 'Assign'}
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

            {/* Add dialog with department picker */}
            <Dialog open={formOpen} onClose={() => setFormOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>{cfl(getString('assignDepartment')) || 'Assign Department'}</DialogTitle>
                <DialogContent>
                    <Box sx={{ mt: 1 }}>
                        {createMutation.isError && <Alert severity="error" sx={{ mb: 1 }}>{createMutation.error?.message}</Alert>}
                        <Autocomplete<DepartmentFlat>
                            options={deptOptions}
                            value={pickedDept}
                            onChange={(_, opt) => setPickedDept(opt)}
                            getOptionLabel={(d) => d.name}
                            isOptionEqualToValue={(a, b) => a.id === b.id}
                            renderInput={(params) => <TextField {...params} label={cfl(getString('department')) || 'Department'} variant="outlined" />}
                        />
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button variant="outlined" onClick={() => setFormOpen(false)} disabled={createMutation.isPending}>{getString('cancel') || 'Cancel'}</Button>
                    <Button
                        variant="contained"
                        disabled={!pickedDept || createMutation.isPending}
                        startIcon={createMutation.isPending ? <CircularProgress size={16} color="inherit" /> : undefined}
                        onClick={() => pickedDept && createMutation.mutate({ process_role_holder_id: holderId, department_id: pickedDept.id })}
                    >
                        {getString('create') || 'Create'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Delete confirm */}
            <Dialog open={!!rowToDelete} onClose={() => setRowToDelete(null)} maxWidth="xs" fullWidth>
                <DialogTitle>{getString('removeAssignment') || 'Remove Assignment'}</DialogTitle>
                <DialogContent>
                    <Typography variant="body2">
                        {getString('areYouSureRemoveDepartment', { department: rowToDelete?.department_name ?? '' }) || `Remove "${rowToDelete?.department_name}"?`}
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button variant="outlined" onClick={() => setRowToDelete(null)} disabled={deleteMutation.isPending}>{getString('cancel') || 'Cancel'}</Button>
                    <Button variant="contained" color="error" disabled={deleteMutation.isPending}
                        startIcon={deleteMutation.isPending ? <CircularProgress size={16} color="inherit" /> : undefined}
                        onClick={() => rowToDelete && deleteMutation.mutate(rowToDelete.id)}>
                        {getString('delete') || 'Delete'}
                    </Button>
                </DialogActions>
            </Dialog>

            <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={() => setSnackbar((p) => ({ ...p, open: false }))} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
                <Alert severity={snackbar.severity} onClose={() => setSnackbar((p) => ({ ...p, open: false }))} sx={{ width: '100%' }}>{snackbar.message}</Alert>
            </Snackbar>
        </Box>
    );
}

// src/components/admin/hrm_scopes/HrmScopesCrud.tsx
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
    Alert,
    Box,
    Button,
    CircularProgress,
    Paper,
    Snackbar,
    Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { DataGrid } from '@mui/x-data-grid';

import {
    fetchHrmEmployees,
    fetchScopesByEmployee,
    type HrmEmployeeRow,
    type HrmScope,
} from './hrmScopeApi';
import { useHrmEmployeeColumns } from './useHrmEmployeeColumns';
import { useHrmScopeColumns } from './useHrmScopeColumns';
import { useHrmScopeMutations } from './useHrmScopeMutations';
import { HrmScopeForm } from './HrmScopeForm';
import { HrmScopeDeleteDialog } from './HrmScopeDeleteDialog';
import { HRM_EMPLOYEE_QK, HRM_SCOPE_QK } from '../../../utils/queryKeys.ts';
import { useDataGridLocale } from '../../../hooks/useDataGridLocale';
import useString from '../../../hooks/useString';
import str from '../../../strings/str';
import cfl from '../../../utils/helpers.ts';

export function HrmScopesCrud() {
    const getString = useString({ str });
    const localeText = useDataGridLocale();

    const [snackbar, setSnackbar] = useState({
        open: false,
        message: '',
        severity: 'success' as 'success' | 'error',
    });
    const [selected, setSelected] = useState<HrmEmployeeRow | null>(null);
    const [formOpen, setFormOpen] = useState(false);
    const [toDelete, setToDelete] = useState<HrmScope | null>(null);

    const { data: hrmEmployees = [], isLoading: empLoading, error: empError } = useQuery({
        queryKey: HRM_EMPLOYEE_QK,
        queryFn: fetchHrmEmployees,
        staleTime: 60 * 1000,
    });

    const { data: scopes = [], isLoading: scopesLoading } = useQuery({
        queryKey: [...HRM_SCOPE_QK, selected?.id],
        queryFn: () => fetchScopesByEmployee(selected!.id),
        enabled: !!selected,
        staleTime: 30 * 1000,
    });

    const { createMutation, deleteMutation } = useHrmScopeMutations({
        setSnackbar,
        deleteSuccessMessage: getString('hrmScopeRemoved') || 'Department removed from scope',
    });

    const empColumns = useHrmEmployeeColumns({ getString });
    const scopeColumns = useHrmScopeColumns({
        getString,
        onDelete: (row) => setToDelete(row),
    });

    const selectedName = useMemo(() => selected?.name ?? '', [selected]);

    return (
        <Box>
            <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
                {getString('hrmScopes') || 'HRM supervision scopes'}
            </Typography>

            {empLoading && (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                    <CircularProgress />
                </Box>
            )}
            {!empLoading && empError && (
                <Alert severity="error" sx={{ m: 2 }}>
                    {(empError as Error).message}
                </Alert>
            )}

            {!empLoading && !empError && (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {/* Top: HRM employees */}
                    <Paper
                        elevation={0}
                        sx={{ border: '1px solid', borderColor: 'divider' }}
                    >
                        <Typography variant="subtitle2" color="text.secondary" sx={{ p: 1.5 }}>
                            {getString('hrmEmployees') || 'HRM employees'}
                        </Typography>
                        <DataGrid
                            rows={hrmEmployees}
                            columns={empColumns}
                            getRowId={(r) => r.id}
                            onRowClick={(p) => setSelected(p.row as HrmEmployeeRow)}
                            disableMultipleRowSelection
                            localeText={localeText}
                            initialState={{ pagination: { paginationModel: { pageSize: 10, page: 0 } } }}
                            pageSizeOptions={[5, 10, 25]}
                            sx={{
                                border: 0,
                                '& .MuiDataGrid-row': { cursor: 'pointer' },
                                '& .MuiDataGrid-row.Mui-selected': { bgcolor: 'action.selected' },
                            }}
                            rowSelectionModel={{
                                type: 'include',
                                ids: new Set(selected ? [selected.id] : []),
                            }}
                        />
                    </Paper>

                    {/* Bottom: scopes for selected HRM */}
                    <Paper
                        elevation={0}
                        sx={{ border: '1px solid', borderColor: 'divider' }}
                    >
                        <Box
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                p: 1.5,
                                gap: 1,
                            }}
                        >
                            <Typography variant="subtitle2" color="text.secondary">
                                {selected
                                    ? getString('scopesFor', { name: selectedName }) ||
                                      `Scope — ${selectedName}`
                                    : getString('selectHrmEmployee') || 'Select an HRM employee'}
                            </Typography>
                            <Button
                                size="small"
                                variant="contained"
                                startIcon={<AddIcon />}
                                disabled={!selected}
                                onClick={() => setFormOpen(true)}
                            >
                                {cfl(getString('addDepartment') || 'Add department')}
                            </Button>
                        </Box>

                        {selected ? (
                            <DataGrid
                                rows={scopes}
                                columns={scopeColumns}
                                getRowId={(r) => r.id}
                                loading={scopesLoading}
                                localeText={localeText}
                                disableRowSelectionOnClick
                                initialState={{ pagination: { paginationModel: { pageSize: 10, page: 0 } } }}
                                pageSizeOptions={[5, 10, 25]}
                                sx={{ border: 0 }}
                            />
                        ) : (
                            <Alert severity="info" sx={{ m: 2 }}>
                                {getString('selectHrmEmployeeHint') ||
                                    'Pick an HRM above to manage their departments.'}
                            </Alert>
                        )}
                    </Paper>
                </Box>
            )}

            {selected && (
                <HrmScopeForm
                    open={formOpen}
                    onClose={() => setFormOpen(false)}
                    employeeId={selected.id}
                    createMutation={createMutation}
                />
            )}

            <HrmScopeDeleteDialog
                open={!!toDelete}
                scope={toDelete}
                pending={deleteMutation.isPending}
                getString={getString}
                onConfirm={() => {
                    if (toDelete) {
                        deleteMutation.mutate(toDelete.id, { onSuccess: () => setToDelete(null) });
                    }
                }}
                onClose={() => setToDelete(null)}
            />

            <Snackbar
                open={snackbar.open}
                autoHideDuration={6000}
                onClose={() => setSnackbar((p) => ({ ...p, open: false }))}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            >
                <Alert
                    severity={snackbar.severity}
                    onClose={() => setSnackbar((p) => ({ ...p, open: false }))}
                    sx={{ width: '100%' }}
                >
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Box>
    );
}

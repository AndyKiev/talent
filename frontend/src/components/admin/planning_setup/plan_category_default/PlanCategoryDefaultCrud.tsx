// src/components/admin/planning_setup/plan_category_default/PlanCategoryDefaultCrud.tsx
import { useCallback, useState } from 'react';
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

import { fetchPlanCategoryDefaults, type PlanCategoryDefault } from '../planningSetupApi';
import { usePlanCategoryDefaultMutations } from './usePlanCategoryDefaultMutations';
import { usePlanCategoryDefaultColumns } from './usePlanCategoryDefaultColumns';
import { PlanCategoryDefaultForm } from './PlanCategoryDefaultForm';
import { useDataGridLocale } from '../../../../hooks/useDataGridLocale';
import { PLAN_CATEGORY_DEFAULT_QK } from '../../../../utils/queryKeys.ts';
import useString from '../../../../hooks/useString';
import str from '../../../../strings/str';
import cfl from '../../../../utils/helpers.ts';
import ConfirmDeleteDialog from '../../../ui/ConfirmDeleteDialog';

export function PlanCategoryDefaultCrud() {
    const getString = useString({ str });

    const [snackbar, setSnackbar] = useState({
        open: false,
        message: '',
        severity: 'success' as 'success' | 'error',
    });
    const [formOpen, setFormOpen] = useState(false);
    const [rowToDelete, setRowToDelete] = useState<PlanCategoryDefault | null>(null);
    const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 10 });

    const { data: rows = [], isLoading, error } = useQuery({
        queryKey: PLAN_CATEGORY_DEFAULT_QK,
        queryFn: fetchPlanCategoryDefaults,
        staleTime: 2 * 60 * 1000,
    });

    const { createMutation, deleteMutation } = usePlanCategoryDefaultMutations({
        setSnackbar,
        onCreateSuccess: () => setFormOpen(false),
        onDeleteSuccess: () => setRowToDelete(null),
        onDeleteError: () => setRowToDelete(null),
    });

    const localeText = useDataGridLocale();

    const handleConfirmDelete = useCallback(() => {
        if (!rowToDelete) return;
        deleteMutation.mutate(rowToDelete.id);
    }, [rowToDelete, deleteMutation]);

    // Category name label for the delete confirmation.
    const deleteLabel = rowToDelete
        ? rowToDelete.department_category?.name ?? `#${rowToDelete.department_category_id}`
        : '';

    const columns = usePlanCategoryDefaultColumns({
        getString,
        onDeleteClick: setRowToDelete,
        deleteIsPending: deleteMutation.isPending,
    });

    const existingCategoryIds = rows.map((r) => r.department_category_id);

    return (
        <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                <Typography variant="h6" fontWeight={600} sx={{ flex: 1 }}>
                    {getString('planCategoryDefaults') || 'Default Planning Categories'}
                </Typography>
                <Button
                    variant="contained"
                    size="medium"
                    startIcon={<AddIcon />}
                    onClick={() => setFormOpen(true)}
                >
                    {cfl(getString('add')) || 'Add'}
                </Button>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {getString('planCategoryDefaultsHint') ||
                    'Department categories used to resolve which departments a new session plans for. Changes apply to future sessions only.'}
            </Typography>

            {isLoading && (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                    <CircularProgress />
                </Box>
            )}

            {!isLoading && error && (
                <Alert severity="error" sx={{ m: 2 }}>
                    {(error as Error).message}
                </Alert>
            )}

            {!isLoading && !error && (
                <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
                    <DataGrid
                        rows={rows}
                        columns={columns}
                        paginationModel={paginationModel}
                        onPaginationModelChange={setPaginationModel}
                        pageSizeOptions={[5, 10, 25, 50]}
                        disableRowSelectionOnClick
                        getRowId={(row) => row.id}
                        getRowHeight={() => 'auto'}
                        localeText={localeText}
                        hideFooterSelectedRowCount
                        sx={{ '& .MuiDataGrid-cell': { alignItems: 'center', py: 1 } }}
                    />
                </Paper>
            )}

            <PlanCategoryDefaultForm
                open={formOpen}
                onClose={() => setFormOpen(false)}
                existingCategoryIds={existingCategoryIds}
                createMutation={createMutation}
            />

            <ConfirmDeleteDialog
                open={!!rowToDelete}
                title={getString('removePlanCategoryDefault') || 'Remove Planning Category'}
                message={getString('areYouSureRemovePlanCategoryDefault', { name: deleteLabel }) || `Remove "${deleteLabel}" from planning defaults? Future sessions will no longer include it.`}
                isDeleting={deleteMutation.isPending}
                onConfirm={handleConfirmDelete}
                onClose={() => setRowToDelete(null)}
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

// src/components/training/employee_training_statuses/EmployeeTrainingStatusCrud.tsx
import {
    Box,
    Paper,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import {
    createEmployeeTrainingStatus,
    deleteEmployeeTrainingStatus,
    fetchEmployeeTrainingStatuses,
    updateEmployeeTrainingStatus,
    type EmployeeTrainingStatus,
} from './employeeTrainingStatusApi';
import { useArrowReorder } from '../../../hooks/useArrowReorder';
import { useEmployeeTrainingStatusColumns } from './useEmployeeTrainingStatusColumns';
import { EmployeeTrainingStatusForm } from './EmployeeTrainingStatusForm';
import { useCrudGrid } from '../../../hooks/useCrudGrid';
import { CrudDialogs } from '../../ui/CrudDialogs';
import useString from '../../../hooks/useString';
import str from '../../../strings/str';
import cfl from '../../../utils/helpers.ts';
import { EMPLOYEE_TRAINING_STATUS_QK } from '../../../utils/queryKeys.ts';
import { AsyncContent } from '../../ui/AsyncContent';
import { CrudHeader } from '../../ui/CrudGridSection';

const bySortOrder = (a: EmployeeTrainingStatus, b: EmployeeTrainingStatus) =>
    (a.sort_order - b.sort_order) || (a.id - b.id);

const FIELD_LABELS = { key: 'key', description: 'description' };

export function EmployeeTrainingStatusCrud() {
    const getString = useString({ str });

    const crud = useCrudGrid({
        queryKey: EMPLOYEE_TRAINING_STATUS_QK,
        fetchFn: () => fetchEmployeeTrainingStatuses(),
        createFn: createEmployeeTrainingStatus,
        updateFn: updateEmployeeTrainingStatus,
        deleteFn: deleteEmployeeTrainingStatus,
        getString,
        fieldLabels: FIELD_LABELS,
        compare: bySortOrder,
    });

    const { orderColumn } = useArrowReorder<EmployeeTrainingStatus>({
        rows: crud.rows,
        updateSortOrder: (id, sort_order) => updateEmployeeTrainingStatus({ id, data: { sort_order } }),
        invalidateKeys: [EMPLOYEE_TRAINING_STATUS_QK],
        getString,
        onError: (message) => crud.setSnackbar({ open: true, message, severity: 'error' }),
    });

    const columns = useEmployeeTrainingStatusColumns({
        getString,
        editingState: crud.editingState,
        onEditFieldClick: crud.handleEditFieldClick,
        onRequestSave: crud.handleRequestSave,
        onCancelEdit: crud.handleCancelEdit,
        updateIsPending: crud.updateMutation.isPending,
        onDeleteClick: crud.handleDeleteClick,
        deleteIsPending: crud.deleteMutation.isPending,
    });

    return (
        <Box>
            <CrudHeader
                title={getString('employeeTrainingStatuses') || 'Employee Training Statuses'}
                addLabel={cfl(getString('addEmployeeTrainingStatus')) || 'Add'}
                onAdd={() => crud.setFormOpen(true)}
            />

            <AsyncContent isLoading={crud.isLoading} error={crud.error}>
                <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
                    <DataGrid
                        rows={crud.rows}
                        columns={[orderColumn, ...columns]}
                        paginationModel={crud.paginationModel}
                        onPaginationModelChange={crud.setPaginationModel}
                        pageSizeOptions={[5, 10, 25, 50]}
                        disableRowSelectionOnClick
                        getRowId={(row) => row.id}
                        getRowHeight={() => 'auto'}
                        localeText={crud.localeText}
                        hideFooterSelectedRowCount
                        sx={{ '& .MuiDataGrid-cell': { alignItems: 'center', py: 1 } }}
                    />
                </Paper>
            </AsyncContent>

            <EmployeeTrainingStatusForm
                open={crud.formOpen}
                onClose={() => crud.setFormOpen(false)}
                createMutation={crud.createMutation}
            />

            <CrudDialogs
                crud={crud}
                deleteTitle={getString('deleteEmployeeTrainingStatus') || 'Delete Employee Training Status'}
                deleteMessage={getString('areYouSureDeleteEmployeeTrainingStatus') || `Are you sure you want to delete "${crud.rowToDelete?.key}"? This action cannot be undone.`}
            />
        </Box>
    );
}

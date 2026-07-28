import {
    Box,
    Paper,
} from '@mui/material';
import {
    createOperation,
    deleteOperation,
    fetchOperations,
    updateOperation,
} from './operationApi.ts';
import { useOperationColumns } from './useOperationColumns.tsx';
import { OperationForm } from './OperationForm.tsx';
import { useCrudGrid } from '../../../../hooks/useCrudGrid';
import { CrudDialogs } from '../../../ui/CrudDialogs';
import useString from '../../../../hooks/useString.ts';
import str from '../../../../strings/str.ts';
import cfl from '../../../../utils/helpers.ts';
import { OPERATION_QK } from '../../../../utils/queryKeys.ts';
import { CrudDataGrid, CrudHeader } from '../../../ui/CrudGridSection';

export function OperationCrud() {
    const getString = useString({ str });

    const crud = useCrudGrid({
        queryKey: OPERATION_QK,
        fetchFn: () => fetchOperations(),
        createFn: createOperation,
        updateFn: updateOperation,
        deleteFn: deleteOperation,
        getString,
    });

    const editingStateForColumns = {
        rowId: crud.editingState.userId,
        field: crud.editingState.field,
    };

    const columns = useOperationColumns({
        getString,
        editingState: editingStateForColumns,
        onEditFieldClick: crud.handleEditFieldClick,
        onSave: (row, field, newValue) => {
            crud.updateMutation.mutate({ id: row.id, data: { [field]: newValue } });
        },
        onCancelEdit: () => crud.handleCancelEdit(),
        updateIsPending: crud.updateMutation.isPending,
        onDeleteClick: crud.handleDeleteClick,
        deleteIsPending: crud.deleteMutation.isPending,
    });

    return (
        <Box>
            <CrudHeader
                title={cfl(getString('operations')) || 'Operations'}
                addLabel={cfl(getString('add')) || 'Add'}
                onAdd={() => crud.setFormOpen(true)}
            />

            <CrudDataGrid crud={crud} columns={columns}
                pageSizeOptions={[10, 25, 50]} />

            {crud.formOpen && (
                <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
                    <OperationForm
                        getString={getString}
                        onSubmit={(d) => crud.createMutation.mutate(d)}
                        isPending={crud.createMutation.isPending}
                    />
                </Paper>
            )}

            <CrudDialogs
                crud={crud}
                deleteTitle={getString('deleteOperation') || 'Delete Operation'}
                deleteMessage={
                    getString('areYouSureDeleteOperation') ||
                    `Are you sure you want to delete "${crud.rowToDelete?.name}"? This action cannot be undone.`
                }
                withFieldEdit={false}
            />
        </Box>
    );
}

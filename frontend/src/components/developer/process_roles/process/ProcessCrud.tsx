// src/components/developer/process_roles/process/ProcessCrud.tsx
import {
    Box,
} from '@mui/material';
import {
    createProcess,
    deleteProcess,
    fetchProcesses,
    updateProcess,
} from './processApi';
import { PROCESS_QK } from '../../../../utils/queryKeys';
import { useProcessColumns } from './useProcessColumns';
import { ProcessForm } from './ProcessForm';
import { useCrudGrid } from '../../../../hooks/useCrudGrid';
import { CrudDialogs } from '../../../ui/CrudDialogs';
import useString from '../../../../hooks/useString';
import cfl from '../../../../utils/capitalizeFirstLetter';
import { CrudDataGrid, CrudHeader } from '../../../ui/CrudGridSection';

const FIELD_LABELS = { name: 'name', key: 'key' };

export function ProcessCrud() {
    const getString = useString();

    const crud = useCrudGrid({
        queryKey: PROCESS_QK,
        fetchFn: () => fetchProcesses(),
        createFn: createProcess,
        updateFn: updateProcess,
        deleteFn: deleteProcess,
        getString,
        fieldLabels: FIELD_LABELS,
    });

    // useProcessColumns expects EditingState with rowId, but useCrudGrid returns userId.
    const editingState = { rowId: crud.editingState.userId, field: crud.editingState.field };

    const columns = useProcessColumns({
        getString,
        editingState,
        onEditFieldClick: crud.handleEditFieldClick,
        onRequestSave: crud.handleRequestSave,
        onCancelEdit: crud.handleCancelEdit,
        updateIsPending: crud.updateMutation.isPending,
        onToggleActive: (row) => crud.requestToggle(row, 'is_active', 'isActive', 'Active'),
        toggleIsPending: crud.updateMutation.isPending,
        onDeleteClick: crud.handleDeleteClick,
        deleteIsPending: crud.deleteMutation.isPending,
    });

    return (
        <Box>
            <CrudHeader
                title={getString('processes') || 'Processes'}
                addLabel={cfl(getString('addProcess')) || 'Add'}
                onAdd={() => crud.setFormOpen(true)}
            />

            <CrudDataGrid crud={crud} columns={columns} />

            <ProcessForm
                open={crud.formOpen}
                onClose={() => crud.setFormOpen(false)}
                createMutation={crud.createMutation}
            />

            <CrudDialogs
                crud={crud}
                deleteTitle={getString('deleteProcess') || 'Delete Process'}
                deleteMessage={getString('areYouSureDeleteProcess', { name: crud.rowToDelete?.name ?? '' }) || `Are you sure you want to delete "${crud.rowToDelete?.name}"?`}
            />
        </Box>
    );
}

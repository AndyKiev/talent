// src/components/developer/process_roles/process_role/ProcessRoleCrud.tsx
import {
    Box,
} from '@mui/material';
import { fetchProcessRoles, createProcessRole, updateProcessRole, deleteProcessRole } from './processRoleApi';
import { PROCESS_ROLE_QK } from '../../../../utils/queryKeys';
import { useProcessRoleColumns, type EditingState } from './useProcessRoleColumns';
import { ProcessRoleForm } from './ProcessRoleForm';
import { useCrudGrid } from '../../../../hooks/useCrudGrid';
import { CrudDialogs } from '../../../ui/CrudDialogs';
import useString from '../../../../hooks/useString';
import cfl from '../../../../utils/capitalizeFirstLetter';
import { CrudDataGrid, CrudHeader } from '../../../ui/CrudGridSection';

const FIELD_LABELS = { name: 'name', short_name: 'shortName', key: 'key' };

export function ProcessRoleCrud() {
    const getString = useString();

    const crud = useCrudGrid({
        queryKey: PROCESS_ROLE_QK,
        fetchFn: () => fetchProcessRoles(),
        createFn: createProcessRole,
        updateFn: updateProcessRole,
        deleteFn: deleteProcessRole,
        getString,
        fieldLabels: FIELD_LABELS,
    });

    const editingState: EditingState = {
        rowId: crud.editingState.userId,
        field: crud.editingState.field,
    };

    const columns = useProcessRoleColumns({
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
                title={getString('processRoles') || 'Process Roles'}
                addLabel={cfl(getString('addProcessRole')) || 'Add'}
                onAdd={() => crud.setFormOpen(true)}
            />

            <CrudDataGrid crud={crud} columns={columns} />

            <ProcessRoleForm
                open={crud.formOpen}
                onClose={() => crud.setFormOpen(false)}
                createMutation={crud.createMutation}
            />

            <CrudDialogs
                crud={crud}
                deleteTitle={getString('deleteProcessRole') || 'Delete Role'}
                deleteMessage={getString('areYouSureDeleteProcessRole', { name: crud.rowToDelete?.name ?? '' }) || `Are you sure you want to delete "${crud.rowToDelete?.name}"?`}
            />
        </Box>
    );
}

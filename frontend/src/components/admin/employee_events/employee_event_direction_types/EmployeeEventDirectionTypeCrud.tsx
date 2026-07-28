// src/components/admin/employee_events/employee_event_direction_types/EmployeeEventDirectionTypeCrud.tsx
import {
    Box,
} from '@mui/material';
import {
    createEmployeeEventDirectionType,
    deleteEmployeeEventDirectionType,
    fetchEmployeeEventDirectionTypes,
    updateEmployeeEventDirectionType,
} from './employeeEventDirectionTypeApi';
import { useEmployeeEventDirectionTypeColumns } from './useEmployeeEventDirectionTypeColumns';
import { useCrudGrid } from '../../../../hooks/useCrudGrid';
import { EmployeeEventDirectionTypeForm } from './EmployeeEventDirectionTypeForm';
import { CrudDialogs } from '../../../ui/CrudDialogs';
import useString from '../../../../hooks/useString';
import str from '../../../../strings/str';
import cfl from '../../../../utils/helpers.ts';
import { CrudDataGrid, CrudHeader } from '../../../ui/CrudGridSection';
import {EMPLOYEE_EVENT_DIRECTION_TYPE_QK} from "../../../../utils/queryKeys.ts";

const FIELD_LABELS = { name: 'name' };

export function EmployeeEventDirectionTypeCrud() {
    const getString = useString({ str });

    const crud = useCrudGrid({
        queryKey: EMPLOYEE_EVENT_DIRECTION_TYPE_QK,
        fetchFn: () => fetchEmployeeEventDirectionTypes(),
        createFn: createEmployeeEventDirectionType,
        updateFn: updateEmployeeEventDirectionType,
        deleteFn: deleteEmployeeEventDirectionType,
        getString,
        fieldLabels: FIELD_LABELS,
    });

    // The slice’s columns still expect rowId, not userId
    const editingStateForColumns = {
        rowId: crud.editingState.userId,
        field: crud.editingState.field,
    };

    const columns = useEmployeeEventDirectionTypeColumns({
        getString,
        editingState: editingStateForColumns,
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
                title={getString('employeeEventDirectionTypes') || 'Employee Event Direction Types'}
                addLabel={cfl(getString('addEmployeeEventDirectionType')) || 'Add'}
                onAdd={() => crud.setFormOpen(true)}
            />

            <CrudDataGrid crud={crud} columns={columns} />

            <EmployeeEventDirectionTypeForm
                open={crud.formOpen}
                onClose={() => crud.setFormOpen(false)}
                createMutation={crud.createMutation}
            />

            <CrudDialogs
                crud={crud}
                deleteTitle={getString('deleteEmployeeEventDirectionType') || 'Delete Employee Event Direction Type'}
                deleteMessage={
                    getString('areYouSureDeleteEmployeeEventDirectionType') ||
                    `Are you sure you want to delete "${crud.rowToDelete?.name}"? This action cannot be undone.`
                }
            />
        </Box>
    );
}

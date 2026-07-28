// src/components/admin/employee_events/employee_event_types/EmployeeEventTypeCrud.tsx
import {
    Box,
} from '@mui/material';

import {
    fetchEmployeeEventTypes,
    createEmployeeEventType,
    updateEmployeeEventType,
    deleteEmployeeEventType,
} from './employeeEventTypeApi.ts';
import { useEmployeeEventTypeColumns } from './useEmployeeEventTypeColumns.tsx';
import { EmployeeEventTypeForm } from './EmployeeEventTypeForm.tsx';
import { useCrudGrid } from '../../../../hooks/useCrudGrid';
import { CrudDialogs } from '../../../ui/CrudDialogs';
import useString from '../../../../hooks/useString.ts';
import str from '../../../../strings/str.ts';
import cfl from '../../../../utils/helpers.ts';
import { EMPLOYEE_EVENT_TYPE_QK } from '../../../../utils/queryKeys.ts';
import { CrudDataGrid, CrudHeader } from '../../../ui/CrudGridSection';

const FIELD_LABELS: Record<string, string> = {
    name: 'name',
    description: 'description',
};

export function EmployeeEventTypeCrud() {
    const getString = useString({ str });

    const crud = useCrudGrid({
        queryKey: EMPLOYEE_EVENT_TYPE_QK,
        fetchFn: fetchEmployeeEventTypes,
        createFn: createEmployeeEventType,
        updateFn: updateEmployeeEventType,
        deleteFn: deleteEmployeeEventType,
        getString,
        fieldLabels: FIELD_LABELS,
    });

    const columns = useEmployeeEventTypeColumns({
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
                title={getString('employeeEventTypes') || 'Employee Event Types'}
                addLabel={cfl(getString('addEmployeeEventType')) || 'Add'}
                onAdd={() => crud.setFormOpen(true)}
            />

            <CrudDataGrid crud={crud} columns={columns} />

            <EmployeeEventTypeForm
                open={crud.formOpen}
                onClose={() => crud.setFormOpen(false)}
                createMutation={crud.createMutation}
            />

            <CrudDialogs
                crud={crud}
                deleteTitle={getString('deleteEmployeeEventType') || 'Delete Employee Event Type'}
                deleteMessage={
                    getString('areYouSureDeleteEmployeeEventType') ||
                    `Are you sure you want to delete "${crud.rowToDelete?.name}"? This action cannot be undone.`
                }
            />
        </Box>
    );
}

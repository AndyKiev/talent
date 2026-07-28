// src/components/admin/employee_events/employee_event_statuses/EmployeeEventStatusCrud.tsx
import {
    Box,
} from '@mui/material';

import {
  createEmployeeEventStatus,
  deleteEmployeeEventStatus,
  fetchEmployeeEventStatuses,
  updateEmployeeEventStatus,
} from './employeeEventStatusApi';
import { useEmployeeEventStatusColumns } from './useEmployeeEventStatusColumns';
import { useCrudGrid } from '../../../../hooks/useCrudGrid';
import { EmployeeEventStatusForm } from './EmployeeEventStatusForm';
import { CrudDialogs } from '../../../ui/CrudDialogs';
import useString from '../../../../hooks/useString';
import str from '../../../../strings/str';
import cfl from '../../../../utils/helpers.ts';
import { CrudDataGrid, CrudHeader } from '../../../ui/CrudGridSection';
import { EMPLOYEE_EVENT_STATUS_QK } from "../../../../utils/queryKeys.ts";

const FIELD_LABELS = { name: 'name', description: 'description' };

export function EmployeeEventStatusCrud() {
  const getString = useString({ str });

  const crud = useCrudGrid({
    queryKey: EMPLOYEE_EVENT_STATUS_QK,
    fetchFn: () => fetchEmployeeEventStatuses(),
    createFn: createEmployeeEventStatus,
    updateFn: updateEmployeeEventStatus,
    deleteFn: deleteEmployeeEventStatus,
    getString,
    fieldLabels: FIELD_LABELS,
  });

  // The slice’s columns still expect rowId, not userId
  const editingStateForColumns = {
    rowId: crud.editingState.userId,
    field: crud.editingState.field,
  };

  const columns = useEmployeeEventStatusColumns({
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
          title={getString('employeeEventStatuses') || 'Employee Event Statuses'}
          addLabel={cfl(getString('addEmployeeEventStatus') || 'Add')}
          onAdd={() => crud.setFormOpen(true)}
      />

      <CrudDataGrid crud={crud} columns={columns} />

      <EmployeeEventStatusForm
        open={crud.formOpen}
        onClose={() => crud.setFormOpen(false)}
        createMutation={crud.createMutation}
      />

      <CrudDialogs
        crud={crud}
        deleteTitle={getString('deleteEmployeeEventStatus') || 'Delete Employee Event Status'}
        deleteMessage={
          getString('areYouSureDeleteEmployeeEventStatus') ||
          `Are you sure you want to delete "${crud.rowToDelete?.name}"? This action cannot be undone.`
        }
      />
    </Box>
  );
}

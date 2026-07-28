// src/components/admin/planning_setup/plan_session_status/PlanSessionStatusCrud.tsx
import {
    Box,
} from '@mui/material';
import {
    createPlanSessionStatus,
    deletePlanSessionStatus,
    fetchPlanSessionStatuses,
    updatePlanSessionStatus,
} from '../planningSetupApi';
import { usePlanSessionStatusColumns } from './usePlanSessionStatusColumns';
import { useCrudGrid } from '../../../../hooks/useCrudGrid';
import { PLAN_SESSION_STATUS_QK } from '../../../../utils/queryKeys.ts';
import useString from '../../../../hooks/useString';
import str from '../../../../strings/str';
import cfl from '../../../../utils/helpers.ts';
import { PlanSessionStatusForm } from './PlanSessionStatusForm.tsx';
import { CrudDialogs } from '../../../ui/CrudDialogs';
import { CrudDataGrid, CrudHeader } from '../../../ui/CrudGridSection';

const FIELD_LABELS = { key: 'key', name: 'name', description: 'description' };

export function PlanSessionStatusCrud() {
    const getString = useString({ str });

    const crud = useCrudGrid({
        queryKey: PLAN_SESSION_STATUS_QK,
        fetchFn: () => fetchPlanSessionStatuses(),
        createFn: createPlanSessionStatus,
        updateFn: updatePlanSessionStatus,
        deleteFn: deletePlanSessionStatus,
        getString,
        fieldLabels: FIELD_LABELS,
    });

    // Adapt editing state to the shape expected by usePlanSessionStatusColumns (rowId instead of userId)
    const editingState = crud.editingState.userId !== null || crud.editingState.field !== null
        ? { rowId: crud.editingState.userId, field: crud.editingState.field }
        : { rowId: null, field: null };

    const columns = usePlanSessionStatusColumns({
        getString,
        editingState,
        onEditFieldClick: crud.handleEditFieldClick,
        onRequestSave: crud.handleRequestSave,
        onCancelEdit: () => crud.handleCancelEdit(),
        updateIsPending: crud.updateMutation.isPending,
        onDeleteClick: crud.handleDeleteClick,
        deleteIsPending: crud.deleteMutation.isPending,
    });

    return (
        <Box>
            <CrudHeader
                title={getString('planSessionStatuses') || 'Plan Session Statuses'}
                addLabel={cfl(getString('addPlanSessionStatus')) || 'Add'}
                onAdd={() => crud.setFormOpen(true)}
            />

            <CrudDataGrid crud={crud} columns={columns} />

            <PlanSessionStatusForm
                open={crud.formOpen}
                onClose={() => crud.setFormOpen(false)}
                createMutation={crud.createMutation}
            />

            <CrudDialogs
                crud={crud}
                deleteTitle={getString('deletePlanSessionStatus') || 'Delete Plan Session Status'}
                deleteMessage={
                    getString('areYouSureDeletePlanSessionStatus', { name: crud.rowToDelete?.name ?? '' })
                    || `Are you sure you want to delete "${crud.rowToDelete?.name}"? This action cannot be undone.`
                }
            />
        </Box>
    );
}

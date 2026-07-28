import {
    Box,
} from '@mui/material';

import { fetchJobGroupTypes, createJobGroupType, updateJobGroupType, deleteJobGroupType, type JobGroupType } from './jobGroupTypeApi';
import { useJobGroupTypeColumns, type EditingState } from './useJobGroupTypeColumns';
import { JobGroupTypeForm } from './JobGroupTypeForm';
import { useCrudGrid } from '../../../hooks/useCrudGrid';
import { CrudDialogs } from '../../ui/CrudDialogs';
import useString from '../../../hooks/useString';
import str from '../../../strings/str';
import cfl from '../../../utils/helpers.ts';
import {JOB_GROUP_TYPE_QK} from "../../../utils/queryKeys.ts";
import { CrudDataGrid, CrudHeader } from '../../ui/CrudGridSection';

const FIELD_LABELS = {
    name: 'name',
    key: 'key',
    description: 'description',
};

export function JobGroupTypeCrud() {
    const getString = useString({ str });

    const crud = useCrudGrid({
        queryKey: JOB_GROUP_TYPE_QK,
        fetchFn: () => fetchJobGroupTypes(),
        createFn: createJobGroupType,
        updateFn: updateJobGroupType,
        deleteFn: deleteJobGroupType,
        getString,
        fieldLabels: FIELD_LABELS,
    });

    // The column builder expects editingState with `rowId`, not `userId`.
    const editingStateForColumns: EditingState = {
        rowId: crud.editingState.userId,
        field: crud.editingState.field,
    };

    const columns = useJobGroupTypeColumns({
        getString,
        editingState: editingStateForColumns,
        onEditFieldClick: crud.handleEditFieldClick,
        onRequestSave: crud.handleRequestSave,
        onCancelEdit: crud.handleCancelEdit,
        updateIsPending: crud.updateMutation.isPending,
        onToggleAllowMultiple: (row) =>
            crud.requestToggle(row, 'allow_multiple', 'allowMultiple', 'Allow Multiple'),
        toggleIsPending: crud.updateMutation.isPending,
        onDeleteClick: crud.handleDeleteClick,
        deleteIsPending: crud.deleteMutation.isPending,
    });

    return (
        <Box>
            <CrudHeader
                title={getString('jobGroupTypes') || 'Job Group Types'}
                addLabel={cfl(getString('addJobGroupType')) || 'Add Type'}
                onAdd={() => crud.setFormOpen(true)}
            />

            <CrudDataGrid crud={crud} columns={columns} />

            <JobGroupTypeForm
                open={crud.formOpen}
                onClose={() => crud.setFormOpen(false)}
                createMutation={crud.createMutation}
            />

            <CrudDialogs
                crud={crud}
                deleteTitle={getString('deleteJobGroupType') || 'Delete Job Group Type'}
                deleteMessage={
                    getString('areYouSureDeleteJobGroupType') ||
                    `Are you sure you want to delete "${crud.rowToDelete ? (crud.rowToDelete as JobGroupType).name : ''}"? This action cannot be undone.`
                }
            />
        </Box>
    );
}

// src/components/admin/talent-statuses/TalentStatusCrud.tsx
import {
    Box,
} from '@mui/material';

import { fetchTalentStatuses, createTalentStatus, updateTalentStatus, deleteTalentStatus } from './talentStatusApi';
import { useTalentStatusColumns } from './useTalentStatusColumns';
import { TalentStatusForm } from './TalentStatusForm';
import { useCrudGrid } from '../../../hooks/useCrudGrid';
import { CrudDialogs } from '../../ui/CrudDialogs';
import useString from '../../../hooks/useString';
import str from '../../../strings/str';
import cfl from '../../../utils/helpers.ts';
import { TALENT_STATUS_QK } from '../../../utils/queryKeys.ts';
import { CrudDataGrid, CrudHeader } from '../../ui/CrudGridSection';

const FIELD_LABELS: Record<string, string> = {
    key: 'key',
    name: 'name',
    description: 'description',
};

export function TalentStatusCrud() {
    const getString = useString({ str });

    const crud = useCrudGrid({
        queryKey: TALENT_STATUS_QK,
        fetchFn: () => fetchTalentStatuses(),
        createFn: createTalentStatus,
        updateFn: updateTalentStatus,
        deleteFn: deleteTalentStatus,
        getString,
        fieldLabels: FIELD_LABELS,
    });

    const columns = useTalentStatusColumns({
        getString,
        editingState: crud.editingState,
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
                title={getString('talentStatuses') || 'Talent Statuses'}
                addLabel={cfl(getString('addTalentStatus')) || 'Add'}
                onAdd={() => crud.setFormOpen(true)}
            />

            <CrudDataGrid crud={crud} columns={columns} />

            <TalentStatusForm
                open={crud.formOpen}
                onClose={() => crud.setFormOpen(false)}
                createMutation={crud.createMutation}
            />

            <CrudDialogs
                crud={crud}
                deleteTitle={getString('deleteTalentStatus') || 'Delete Talent Status'}
                deleteMessage={getString('areYouSureDeleteTalentStatus') || `Are you sure you want to delete "${crud.rowToDelete?.name}"? This action cannot be undone.`}
            />
        </Box>
    );
}

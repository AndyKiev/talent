// src/components/admin/talent-periods/TalentPeriodCrud.tsx
import {
    Box,
} from '@mui/material';
import { fetchTalentPeriods, createTalentPeriod, updateTalentPeriod, deleteTalentPeriod } from './talentPeriodApi';
import { useTalentPeriodColumns } from './useTalentPeriodColumns';
import { TalentPeriodForm } from './TalentPeriodForm';
import { useCrudGrid } from '../../../hooks/useCrudGrid';
import { CrudDialogs } from '../../ui/CrudDialogs';
import useString from '../../../hooks/useString';
import str from '../../../strings/str';
import cfl from '../../../utils/helpers.ts';
import { TALENT_PERIOD_QK } from '../../../utils/queryKeys.ts';
import { CrudDataGrid, CrudHeader } from '../../ui/CrudGridSection';

const FIELD_LABELS = { name: 'name', description: 'description' };

export function TalentPeriodCrud() {
    const getString = useString({ str });

    const crud = useCrudGrid({
        queryKey: TALENT_PERIOD_QK,
        fetchFn: () => fetchTalentPeriods(),
        createFn: createTalentPeriod,
        updateFn: updateTalentPeriod,
        deleteFn: deleteTalentPeriod,
        getString,
        fieldLabels: FIELD_LABELS,
    });

    const columns = useTalentPeriodColumns({
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
                title={getString('talentPeriods') || 'Talent Periods'}
                addLabel={cfl(getString('addTalentPeriod')) || 'Add'}
                onAdd={() => crud.setFormOpen(true)}
            />

            <CrudDataGrid crud={crud} columns={columns} />

            <TalentPeriodForm
                open={crud.formOpen}
                onClose={() => crud.setFormOpen(false)}
                createMutation={crud.createMutation}
            />

            <CrudDialogs
                crud={crud}
                deleteTitle={getString('deleteTalentPeriod') || 'Delete Talent Period'}
                deleteMessage={getString('areYouSureDeleteTalentPeriod') || `Are you sure you want to delete "${crud.rowToDelete?.name}"? This action cannot be undone.`}
            />
        </Box>
    );
}

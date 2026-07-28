import {
    Box,
    Paper,
} from '@mui/material';
import {
    createEssence,
    deleteEssence,
    fetchEssences,
    updateEssence,
} from './essenceApi.ts';
import { useEssenceColumns } from './useEssenceColumns.tsx';
import { EssenceForm } from './EssenceForm.tsx';
import { useCrudGrid } from '../../../../hooks/useCrudGrid';
import { CrudDialogs } from '../../../ui/CrudDialogs';
import useString from '../../../../hooks/useString.ts';
import str from '../../../../strings/str.ts';
import cfl from '../../../../utils/helpers.ts';
import { ESSENCE_QK } from '../../../../utils/queryKeys.ts';
import { CrudDataGrid, CrudHeader } from '../../../ui/CrudGridSection';

export function EssenceCrud() {
    const getString = useString({ str });

    const crud = useCrudGrid({
        queryKey: ESSENCE_QK,
        fetchFn: () => fetchEssences(),
        createFn: createEssence,
        updateFn: updateEssence,
        deleteFn: deleteEssence,
        getString,
    });

    const editingStateForColumns = {
        rowId: crud.editingState.userId,
        field: crud.editingState.field,
    };

    const columns = useEssenceColumns({
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
                title={cfl(getString('essences')) || 'Essences'}
                addLabel={cfl(getString('add')) || 'Add'}
                onAdd={() => crud.setFormOpen(true)}
            />

            <CrudDataGrid crud={crud} columns={columns}
                pageSizeOptions={[10, 25, 50]} />

            {crud.formOpen && (
                <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
                    <EssenceForm
                        getString={getString}
                        onSubmit={(d) => crud.createMutation.mutate(d)}
                        isPending={crud.createMutation.isPending}
                    />
                </Paper>
            )}

            <CrudDialogs
                crud={crud}
                deleteTitle={getString('deleteEssence') || 'Delete Essence'}
                deleteMessage={
                    getString('areYouSureDeleteEssence') ||
                    `Are you sure you want to delete "${crud.rowToDelete?.name}"? This action cannot be undone.`
                }
                withFieldEdit={false}
            />
        </Box>
    );
}

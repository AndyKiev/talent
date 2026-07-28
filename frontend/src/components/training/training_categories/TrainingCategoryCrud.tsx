// src/components/training/training_categories/TrainingCategoryCrud.tsx
import {
    Box,
} from '@mui/material';
import {
    fetchTrainingCategories,
    createTrainingCategory,
    updateTrainingCategory,
    deleteTrainingCategory,
} from './trainingCategoryApi';
import { useTrainingCategoryColumns } from './useTrainingCategoryColumns';
import { TrainingCategoryForm } from './TrainingCategoryForm';
import { useCrudGrid } from '../../../hooks/useCrudGrid';
import { CrudDialogs } from '../../ui/CrudDialogs';
import useString from '../../../hooks/useString';
import str from '../../../strings/str';
import cfl from '../../../utils/helpers.ts';
import { TRAINING_CATEGORY_QK } from '../../../utils/queryKeys.ts';
import { CrudDataGrid, CrudHeader } from '../../ui/CrudGridSection';

const FIELD_LABELS = { name: 'name', key: 'key', description: 'description' };

export function TrainingCategoryCrud() {
    const getString = useString({ str });

    const crud = useCrudGrid({
        queryKey: TRAINING_CATEGORY_QK,
        fetchFn: () => fetchTrainingCategories(),
        createFn: createTrainingCategory,
        updateFn: updateTrainingCategory,
        deleteFn: deleteTrainingCategory,
        getString,
        fieldLabels: FIELD_LABELS,
    });

    const columns = useTrainingCategoryColumns({
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
                title={getString('trainingCategories') || 'Training Categories'}
                addLabel={cfl(getString('addTrainingCategory')) || 'Add'}
                onAdd={() => crud.setFormOpen(true)}
            />

            <CrudDataGrid crud={crud} columns={columns} />

            <TrainingCategoryForm
                open={crud.formOpen}
                onClose={() => crud.setFormOpen(false)}
                createMutation={crud.createMutation}
            />

            <CrudDialogs
                crud={crud}
                deleteTitle={getString('deleteTrainingCategory') || 'Delete Training Category'}
                deleteMessage={getString('areYouSureDeleteTrainingCategory') || `Are you sure you want to delete "${crud.rowToDelete?.name}"? This action cannot be undone.`}
            />
        </Box>
    );
}

import { useCallback, useState } from 'react';
import {
    Box,
} from '@mui/material';
import {
    fetchTrainingTypes,
    createTrainingType,
    updateTrainingType,
    deleteTrainingType,
    type TrainingType,
} from './trainingTypeApi';
import { useTrainingTypeColumns } from './useTrainingTypeColumns';
import { TrainingTypeForm } from './TrainingTypeForm';
import { useCrudGrid } from '../../../hooks/useCrudGrid';
import { CrudDialogs } from '../../ui/CrudDialogs';
import useString from '../../../hooks/useString';
import str from '../../../strings/str';
import cfl from '../../../utils/helpers.ts';
import { TRAINING_TYPE_QK } from '../../../utils/queryKeys.ts';
import { CrudDataGrid, CrudHeader } from '../../ui/CrudGridSection';

export function TrainingTypeCrud() {
    const getString = useString({ str });

    const [editingRecord, setEditingRecord] = useState<TrainingType | null>(null);

    const crud = useCrudGrid({
        queryKey: TRAINING_TYPE_QK,
        fetchFn: () => fetchTrainingTypes(),
        createFn: createTrainingType,
        updateFn: updateTrainingType,
        deleteFn: deleteTrainingType,
        getString,
    });

    const { setFormOpen } = crud;

    const handleAddClick = useCallback(() => {
        setEditingRecord(null);
        setFormOpen(true);
    }, [setFormOpen]);

    const handleEditClick = useCallback((row: TrainingType) => {
        setEditingRecord(row);
        setFormOpen(true);
    }, [setFormOpen]);

    const handleFormClose = useCallback(() => {
        setFormOpen(false);
        setEditingRecord(null);
    }, [setFormOpen]);

    const columns = useTrainingTypeColumns({
        getString,
        onEditClick: handleEditClick,
        onDeleteClick: crud.handleDeleteClick,
        deleteIsPending: crud.deleteMutation.isPending,
    });

    return (
        <Box>
            <CrudHeader
                title={getString('trainingTypes') || 'Training Types'}
                addLabel={cfl(getString('addTrainingType')) || 'Add'}
                onAdd={handleAddClick}
            />

            <CrudDataGrid crud={crud} columns={columns} />

            <TrainingTypeForm
                open={crud.formOpen}
                onClose={handleFormClose}
                editingRecord={editingRecord}
                createMutation={crud.createMutation}
                updateMutation={crud.updateMutation}
            />

            <CrudDialogs
                crud={crud}
                deleteTitle={getString('deleteTrainingType') || 'Delete Training Type'}
                deleteMessage={getString('areYouSureDeleteTrainingType') || `Are you sure you want to delete "${crud.rowToDelete?.name}"? This action cannot be undone.`}
                withFieldEdit={false}
            />
        </Box>
    );
}

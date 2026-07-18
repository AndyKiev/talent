// src/components/training/training_types/useTrainingTypeMutations.ts
import {
    createTrainingType,
    deleteTrainingType,
    updateTrainingType,
} from './trainingTypeApi';
import { TRAINING_TYPE_QK } from '../../../utils/queryKeys.ts';
import { useCrudMutations, type CrudMutationCallbacks } from '../../../hooks/useCrudMutations';

export function useTrainingTypeMutations(callbacks: CrudMutationCallbacks) {
    const crud = useCrudMutations({
        queryKey: TRAINING_TYPE_QK,
        createFn: createTrainingType,
        updateFn: updateTrainingType,
        deleteFn: deleteTrainingType,
        ...callbacks,
    });
    return crud;
}

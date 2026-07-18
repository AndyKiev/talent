// src/components/training/training_categories/useTrainingCategoryMutations.ts
import {
    createTrainingCategory,
    deleteTrainingCategory,
    updateTrainingCategory,
} from './trainingCategoryApi';
import { TRAINING_CATEGORY_QK } from '../../../utils/queryKeys.ts';
import { useCrudMutations, type CrudMutationCallbacks } from '../../../hooks/useCrudMutations';

export function useTrainingCategoryMutations(callbacks: CrudMutationCallbacks) {
    const crud = useCrudMutations({
        queryKey: TRAINING_CATEGORY_QK,
        createFn: createTrainingCategory,
        updateFn: updateTrainingCategory,
        deleteFn: deleteTrainingCategory,
        ...callbacks,
    });
    return crud;
}

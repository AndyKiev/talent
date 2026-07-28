import { useCrudMutations, type CrudMutationCallbacks } from '../../../hooks/useCrudMutations';
import {
    createReviewDimension,
    updateReviewDimension,
    deleteReviewDimension,
} from './reviewDimensionApi';

export const REVIEW_DIMENSION_QK = ['review_dimensions'] as const;

export function useReviewDimensionMutations(callbacks: CrudMutationCallbacks) {
    return useCrudMutations({
        queryKey: REVIEW_DIMENSION_QK,
        createFn: createReviewDimension,
        updateFn: updateReviewDimension,
        deleteFn: deleteReviewDimension,
        ...callbacks,
    });
}

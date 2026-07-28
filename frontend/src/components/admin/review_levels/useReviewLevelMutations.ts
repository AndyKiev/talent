import { useCrudMutations, type CrudMutationCallbacks } from '../../../hooks/useCrudMutations';
import {
    createReviewLevel,
    updateReviewLevel,
    deleteReviewLevel,
} from './reviewLevelApi';

export const REVIEW_LEVEL_QK = ['review_levels'] as const;

export function useReviewLevelMutations(callbacks: CrudMutationCallbacks) {
    return useCrudMutations({
        queryKey: REVIEW_LEVEL_QK,
        createFn: createReviewLevel,
        updateFn: updateReviewLevel,
        deleteFn: deleteReviewLevel,
        ...callbacks,
    });
}

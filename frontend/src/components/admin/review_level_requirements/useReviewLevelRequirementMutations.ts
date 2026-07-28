import {
    createReviewLevelRequirement,
    updateReviewLevelRequirement,
    deleteReviewLevelRequirement,
} from './reviewLevelRequirementApi';
import { useCrudMutations, type CrudMutationCallbacks } from '../../../hooks/useCrudMutations';

export const REVIEW_LEVEL_REQUIREMENT_QK = ['review_level_requirements'] as const;

export function useReviewLevelRequirementMutations(callbacks: CrudMutationCallbacks) {
    const crud = useCrudMutations({
        queryKey: REVIEW_LEVEL_REQUIREMENT_QK,
        createFn: createReviewLevelRequirement,
        updateFn: updateReviewLevelRequirement,
        deleteFn: deleteReviewLevelRequirement,
        ...callbacks,
    });
    return crud;
}

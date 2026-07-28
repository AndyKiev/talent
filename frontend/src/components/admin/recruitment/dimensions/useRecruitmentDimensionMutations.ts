import {
    createRecruitmentDimension,
    updateRecruitmentDimension,
    deleteRecruitmentDimension,
} from './recruitmentDimensionApi';
import { RECRUITMENT_DIMENSION_QK } from '../../../../utils/queryKeys';
import { useCrudMutations, type CrudMutationCallbacks } from '../../../../hooks/useCrudMutations';

export function useRecruitmentDimensionMutations(callbacks: CrudMutationCallbacks) {
    const crud = useCrudMutations({
        queryKey: RECRUITMENT_DIMENSION_QK,
        createFn: createRecruitmentDimension,
        updateFn: updateRecruitmentDimension,
        deleteFn: deleteRecruitmentDimension,
        ...callbacks,
    });
    return crud;
}

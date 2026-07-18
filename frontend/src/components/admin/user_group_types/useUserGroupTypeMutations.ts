// src/components/admin/user_group_types/useUserGroupTypeMutations.ts
import {createUserGroupType, deleteUserGroupType, updateUserGroupType,} from './userGroupTypeApi';
import { USER_GROUP_TYPE_QK } from "../../../utils/queryKeys.ts";
import { useCrudMutations, type CrudMutationCallbacks } from '../../../hooks/useCrudMutations';

export function useUserGroupTypeMutations(callbacks: CrudMutationCallbacks) {
    const crud = useCrudMutations({
        queryKey: USER_GROUP_TYPE_QK,
        createFn: createUserGroupType,
        updateFn: updateUserGroupType,
        deleteFn: deleteUserGroupType,
        ...callbacks,
    });
    return crud;
}

// src/components/admin/departments/useAllowedDepartmentTypes.ts
import { useQuery } from '@tanstack/react-query';
import { fetchChildrenByParentType, type DepartmentType } from './departmentApi.ts';

/**
 * Returns the list of department types that are valid choices for a department
 * whose parent has `parentTypeId` as its department_type_id.
 *
 * - parentTypeId = null  → root department, no constraint → returns allTypes unchanged
 * - parentTypeId = N     → fetches /admin/department_types/{N}/children and returns those
 *
 * `allTypes` is the full list already loaded by the caller (used as fallback and
 * to map ids → names for the root case).
 */
export function useAllowedDepartmentTypes(
    parentTypeId: number | null,
    allTypes: DepartmentType[],
) {
    const { data: children, isLoading } = useQuery({
        queryKey: ['department_type_children', parentTypeId],
        queryFn: () => fetchChildrenByParentType(parentTypeId!),
        enabled: parentTypeId != null,
        staleTime: 2 * 60 * 1000,
    });

    if (parentTypeId == null) {
        return { allowedTypes: allTypes, isLoading: false };
    }

    return {
        allowedTypes: children ?? [],
        isLoading,
    };
}

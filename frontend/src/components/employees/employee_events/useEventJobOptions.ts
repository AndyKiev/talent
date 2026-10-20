// src/components/employees/employee_events/useEventJobOptions.ts
// JOB_CHANGE options, shared by the create dialog and the drawer: any job of
// any department INSIDE the target main department (the department itself +
// its whole subtree), via each department's TYPE -> department_type_job_links.
//   - event type changes the main dept (ACTIVATION, TRANSFER) -> the NEW main
//     department (no options until it is chosen);
//   - otherwise (PROMOTION) -> the CURRENT main department.
// The employee's current job is always excluded (we are changing it).
import { useQueries } from '@tanstack/react-query';
import { fetchJobsByDepartmentType, type DepartmentOption, type JobOption } from './employeeEventApi';

interface Args {
    enabled: boolean;
    eventTypeHasMainDept: boolean;
    newMainDeptId: number | null;
    currentMainDeptId: number | null;
    currentJobId: number | null;
    departments: DepartmentOption[];
}

/** Department TYPE ids of `rootId` and all its descendants. */
const subtreeTypeIds = (rootId: number, departments: DepartmentOption[]): number[] => {
    const childrenOf = new Map<number, DepartmentOption[]>();
    departments.forEach((d) => {
        if (d.parent_id != null) childrenOf.set(d.parent_id, [...(childrenOf.get(d.parent_id) ?? []), d]);
    });
    const types = new Set<number>();
    const stack = departments.filter((d) => d.id === rootId);
    while (stack.length > 0) {
        const d = stack.pop()!;
        types.add(d.department_type_id);
        stack.push(...(childrenOf.get(d.id) ?? []));
    }
    return [...types];
};

export function useEventJobOptions({
    enabled,
    eventTypeHasMainDept,
    newMainDeptId,
    currentMainDeptId,
    currentJobId,
    departments,
}: Args): { jobs: JobOption[]; isLoading: boolean } {
    const rootId = eventTypeHasMainDept ? newMainDeptId : currentMainDeptId;
    const typeIds = enabled && rootId != null ? subtreeTypeIds(rootId, departments) : [];

    const results = useQueries({
        queries: typeIds.map((typeId) => ({
            queryKey: ['jobs-by-dept-type', typeId],
            queryFn: () => fetchJobsByDepartmentType(typeId),
            staleTime: 5 * 60 * 1000,
        })),
    });

    const byId = new Map<number, JobOption>();
    results.forEach((r) => (r.data ?? []).forEach((j) => byId.set(j.id, { id: j.id, name: j.name })));
    if (currentJobId != null) byId.delete(currentJobId);

    return {
        jobs: [...byId.values()].sort((a, b) => a.name.localeCompare(b.name)),
        isLoading: results.some((r) => r.isLoading),
    };
}

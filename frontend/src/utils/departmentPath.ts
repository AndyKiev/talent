// src/utils/departmentPath.ts
//
// Label a department together with its ROOT (main) department instance, e.g.
// "Почайна - Комерція" — used wherever an exact department instance would be
// ambiguous without knowing which store/directorate it belongs to.

export interface DepartmentPathItem {
    id: number;
    name: string;
    parent_id: number | null;
}

/**
 * Walk parent_id links upward and return "Main - Dept", where MAIN is the
 * top department INSTANCE (store / directorate — the child of the absolute
 * root), e.g. "Почайна - Комерція". Just the name when the department is
 * itself the root or a top instance; null when the id is unknown/absent.
 */
export function departmentPathLabel(
    deptId: number | null | undefined,
    byId: Map<number, DepartmentPathItem>,
): string | null {
    if (deptId == null) return null;
    const dept = byId.get(deptId);
    if (!dept) return null;
    const chain: DepartmentPathItem[] = [dept];
    const seen = new Set<number>([dept.id]);
    let cur = dept;
    while (cur.parent_id != null && !seen.has(cur.parent_id)) {
        const parent = byId.get(cur.parent_id);
        if (!parent) break;
        seen.add(parent.id);
        chain.push(parent);
        cur = parent;
    }
    // chain = [dept, ..., absolute root]. The "main" instance is the root's
    // direct child; a dept at or directly under the root shows plain.
    if (chain.length <= 2) return dept.name;
    const main = chain[chain.length - 2];
    return `${main.name} - ${dept.name}`;
}

export function departmentMapById(
    departments: DepartmentPathItem[],
): Map<number, DepartmentPathItem> {
    return new Map(departments.map((d) => [d.id, d]));
}

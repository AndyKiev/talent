// src/components/admin/departments/organigram/buildDepartmentGraph.ts
//
// Pure helpers turning the department tree (GET /departments/tree) into the
// organigram's drawn nodes. Departments have ONE parent, so a department is
// drawn at most once; the node key is still its path (`/rootId/…/id`) to fit
// the generic OrganigramTree. The type-structure match is NOT computed here —
// it comes from the backend (`matches_type_structure`).
import type { DepartmentNode } from '../departmentApi';

export interface DepartmentGraph {
    /** Every department (hidden ones too), the original backend nodes — their
     *  `children` are complete, unlike a depth-cut drawn node. */
    deptById: Map<number, DepartmentNode>;
    /** Visible roots (no parent), by name. */
    roots: DepartmentNode[];
    /** Visible children of a department, by name. */
    visibleChildren: (dept: DepartmentNode) => DepartmentNode[];
}

export interface DeptTreeNode {
    key: string;
    dept: DepartmentNode;
    children: DeptTreeNode[];
    /** Total visible children (drawn or cut by depth). */
    childCount: number;
    /** Children not drawn because the depth limit was reached. */
    hiddenChildCount: number;
}

const byName = (a: DepartmentNode, b: DepartmentNode) => a.name.localeCompare(b.name);

export function buildDepartmentGraph(tree: DepartmentNode[], hideInactive: boolean): DepartmentGraph {
    const deptById = new Map<number, DepartmentNode>();
    const walk = (n: DepartmentNode) => {
        deptById.set(n.id, n);
        n.children.forEach(walk);
    };
    tree.forEach(walk);
    const visible = (d: DepartmentNode) => !hideInactive || d.is_active;
    return {
        deptById,
        roots: tree.filter(visible).sort(byName),
        visibleChildren: (dept) => dept.children.filter(visible).sort(byName),
    };
}

/** The drawn subtree under `dept`, `depth` levels deep. */
export function buildDeptSubtree(
    graph: DepartmentGraph,
    dept: DepartmentNode,
    depth: number,
    parentKey = '',
): DeptTreeNode {
    const key = `${parentKey}/${dept.id}`;
    const kids = graph.visibleChildren(dept);
    return {
        key,
        dept,
        children: depth > 0 ? kids.map((c) => buildDeptSubtree(graph, c, depth - 1, key)) : [],
        childCount: kids.length,
        hiddenChildCount: depth > 0 ? 0 : kids.length,
    };
}

/** Root → … → id following parent_id upward. */
export function deptChain(graph: DepartmentGraph, id: number): DepartmentNode[] {
    const chain: DepartmentNode[] = [];
    const seen = new Set<number>();
    let cur = graph.deptById.get(id);
    while (cur && !seen.has(cur.id)) {
        seen.add(cur.id);
        chain.unshift(cur);
        cur = cur.parent_id != null ? graph.deptById.get(cur.parent_id) : undefined;
    }
    return chain;
}

/** True when `id` is `ancestor` itself or lies under it (move = cycle). */
export function isInSubtree(graph: DepartmentGraph, ancestor: number, id: number): boolean {
    let cur = graph.deptById.get(id);
    const seen = new Set<number>();
    while (cur && !seen.has(cur.id)) {
        if (cur.id === ancestor) return true;
        seen.add(cur.id);
        cur = cur.parent_id != null ? graph.deptById.get(cur.parent_id) : undefined;
    }
    return false;
}

// src/components/admin/department_types/organigram/buildDeptTypeGraph.ts
//
// Pure helpers turning the flat department types + parental links into the
// organigram's tree. The type graph is MANY-TO-MANY (one type may have several
// parents), so a type can appear several times — every node is identified by
// its PATH key (`/rootId/…/typeId`), never by the type id alone.
import type { DepartmentType } from '../departmentTypeApi';
import type { ParentalLink } from '../departmentTypeParentalLinkApi';

export interface DeptTypeGraph {
    typeById: Map<number, DepartmentType>;
    /** parent id -> links to its children (visible ones, see hideInactive). */
    childLinks: Map<number, ParentalLink[]>;
    /** child id -> links to its parents (visible ones). */
    parentLinks: Map<number, ParentalLink[]>;
    /** Visible types with children but no visible parent (tree tops), by name. */
    roots: DepartmentType[];
    /** Visible types with neither parent nor children (not in any tree). */
    orphans: DepartmentType[];
    /** parent id -> child ids over ALL links (cycle / duplicate checks). */
    allChildIds: Map<number, number[]>;
    /** `${child}:${parent}` for ALL links (the DB unique pair). */
    allPairs: Set<string>;
}

export interface TypeTreeNode {
    key: string;
    type: DepartmentType;
    /** The link from the parent shown above; null for a top card. */
    link: ParentalLink | null;
    parentId: number | null;
    children: TypeTreeNode[];
    /** Total visible children (drawn or cut by depth). */
    childCount: number;
    /** Children not drawn because the depth limit was reached. */
    hiddenChildCount: number;
}

const byName = (a: DepartmentType, b: DepartmentType) => a.name.localeCompare(b.name);

const push = <K, V>(map: Map<K, V[]>, key: K, value: V) => {
    const list = map.get(key);
    if (list) list.push(value);
    else map.set(key, [value]);
};

export function buildDeptTypeGraph(
    types: DepartmentType[],
    links: ParentalLink[],
    hideInactive: boolean,
): DeptTypeGraph {
    const typeById = new Map(types.map((t) => [t.id, t]));
    const visible = (t: DepartmentType | undefined): t is DepartmentType =>
        t != null && (!hideInactive || t.is_active);

    const childLinks = new Map<number, ParentalLink[]>();
    const parentLinks = new Map<number, ParentalLink[]>();
    const allChildIds = new Map<number, number[]>();
    const allPairs = new Set<string>();

    for (const link of links) {
        push(allChildIds, link.parent_id, link.child_id);
        allPairs.add(`${link.child_id}:${link.parent_id}`);
        if (hideInactive && !link.is_active) continue;
        if (!visible(typeById.get(link.child_id)) || !visible(typeById.get(link.parent_id)))
            continue;
        push(childLinks, link.parent_id, link);
        push(parentLinks, link.child_id, link);
    }

    const nameOf = (id: number) => typeById.get(id)?.name ?? '';
    for (const list of childLinks.values())
        list.sort((a, b) => nameOf(a.child_id).localeCompare(nameOf(b.child_id)));
    for (const list of parentLinks.values())
        list.sort((a, b) => nameOf(a.parent_id).localeCompare(nameOf(b.parent_id)));

    const tops = types.filter((t) => visible(t) && !parentLinks.has(t.id)).sort(byName);
    const roots = tops.filter((t) => childLinks.has(t.id));
    const orphans = tops.filter((t) => !childLinks.has(t.id));

    return { typeById, childLinks, parentLinks, roots, orphans, allChildIds, allPairs };
}

/** The subtree under `typeId`, `depth` levels deep. A type already on the
 *  current path is skipped (defensive: the backend rejects cycles). */
export function buildSubtree(
    graph: DeptTypeGraph,
    typeId: number,
    link: ParentalLink | null,
    depth: number,
    parentKey = '',
    onPath: ReadonlySet<number> = new Set(),
): TypeTreeNode | null {
    const type = graph.typeById.get(typeId);
    if (!type) return null;
    const key = `${parentKey}/${typeId}`;
    const path = new Set(onPath).add(typeId);
    const links = (graph.childLinks.get(typeId) ?? []).filter((l) => !path.has(l.child_id));
    const children =
        depth > 0
            ? links
                  .map((l) => buildSubtree(graph, l.child_id, l, depth - 1, key, path))
                  .filter((n): n is TypeTreeNode => n != null)
            : [];
    return {
        key,
        type,
        link,
        parentId: link?.parent_id ?? null,
        children,
        childCount: links.length,
        hiddenChildCount: depth > 0 ? 0 : links.length,
    };
}

/** True when `to` is reachable downward from `from` over ALL links. */
export function reaches(graph: DeptTypeGraph, from: number, to: number): boolean {
    const seen = new Set<number>();
    const stack = [from];
    while (stack.length) {
        const node = stack.pop()!;
        if (node === to) return true;
        if (seen.has(node)) continue;
        seen.add(node);
        stack.push(...(graph.allChildIds.get(node) ?? []));
    }
    return false;
}

/** Whether `childId` may get `parentId` as a (new) parent: not itself, no
 *  existing link for the pair, and no cycle. Mirrors the backend guard. */
export function canLink(graph: DeptTypeGraph, childId: number, parentId: number): boolean {
    return (
        childId !== parentId &&
        !graph.allPairs.has(`${childId}:${parentId}`) &&
        !reaches(graph, childId, parentId)
    );
}

/** Root → … → typeId following the first (by name) visible parent upward. */
export function chainTo(graph: DeptTypeGraph, typeId: number): number[] {
    const chain: number[] = [];
    const seen = new Set<number>();
    let cur: number | undefined = typeId;
    while (cur != null && !seen.has(cur)) {
        seen.add(cur);
        chain.unshift(cur);
        cur = graph.parentLinks.get(cur)?.[0]?.parent_id;
    }
    return chain;
}

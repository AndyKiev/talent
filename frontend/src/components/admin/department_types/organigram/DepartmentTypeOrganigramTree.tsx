// src/components/admin/department_types/organigram/DepartmentTypeOrganigramTree.tsx
//
// The department-TYPE organigram drawn by the generic OrganigramTree: type
// cards, per-type layout overrides from the type organigram's own store, and
// dashed edges for inactive parental links.
import { OrganigramTree } from '../../../organigram/OrganigramTree';
import type { OrganigramOrientation } from '../../../organigram/organigramOrientation';
import { useDeptTypeOrganigramStore } from '../../../../store/deptTypeOrganigramStore';
import { DepartmentTypeOrganigramCard } from './DepartmentTypeOrganigramCard';
import type { OrgCtx } from './organigramDrag';
import type { TypeTreeNode } from './buildDeptTypeGraph';

export function DepartmentTypeOrganigramTree({
    focus,
    roots,
    orientation,
    highlightKey,
    ctx,
}: {
    focus: TypeTreeNode | null;
    roots: TypeTreeNode[];
    orientation: OrganigramOrientation;
    highlightKey: string | null;
    ctx: OrgCtx;
}) {
    const overrides = useDeptTypeOrganigramStore((s) => s.layoutOverrides);
    const setLayoutOverride = useDeptTypeOrganigramStore((s) => s.setLayoutOverride);
    return (
        <OrganigramTree<TypeTreeNode>
            focus={focus}
            roots={roots}
            orientation={orientation}
            highlightKey={highlightKey}
            overrides={overrides}
            setLayoutOverride={setLayoutOverride}
            layoutIdOf={(n) => n.type.id}
            isDashed={(n) => n.link != null && !n.link.is_active}
            renderCard={(n, slot) => (
                <DepartmentTypeOrganigramCard
                    node={n}
                    ctx={ctx}
                    emphasis={slot.emphasis}
                    isFocus={slot.isFocus}
                    layout={slot.layout}
                />
            )}
        />
    );
}

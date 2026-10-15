// src/components/admin/department_types/organigram/organigramDrag.ts
//
// Drag-and-drop plumbing shared by the type cards and the root palette.
import type { DepartmentType } from '../departmentTypeApi';
import type { ParentalLink } from '../departmentTypeParentalLinkApi';
import type { DeptTypeGraph } from './buildDeptTypeGraph';
import type { GetStringFn } from '../../../../types/getStringFn';

/** The card being dragged: its type and the link it hangs on (null for a
 *  top card or a palette chip — dropping those always CREATES a link). */
export interface DragSource {
    type: DepartmentType;
    link: ParentalLink | null;
}

export type DropAction = 'move' | 'add';

export interface HoverTarget {
    key: string;
    type: DepartmentType;
    action: DropAction;
}

export const dropActionFor = (src: DragSource, ctrl: boolean): DropAction =>
    src.link == null || ctrl ? 'add' : 'move';

export interface OrgCtx {
    getString: GetStringFn;
    graph: DeptTypeGraph;
    dragMode: boolean;
    dragging: DragSource | null;
    hover: HoverTarget | null;
    /** Card found by the types panel's find-next (outlined). */
    highlightKey: string | null;
    onFocus: (nodeKey: string) => void;
    onDragStart: (src: DragSource) => void;
    onDragEnd: () => void;
    onHover: (target: HoverTarget | null) => void;
    onDrop: (target: DepartmentType, action: DropAction) => void;
}

/** Start a drag carrying `src`; copyMove so a Ctrl drop is not refused. */
export const startDrag = (
    e: React.DragEvent,
    src: DragSource,
    onDragStart: (src: DragSource) => void,
) => {
    e.dataTransfer.effectAllowed = 'copyMove';
    // Firefox needs data for the drag to start.
    e.dataTransfer.setData('text/plain', src.type.name);
    onDragStart(src);
};

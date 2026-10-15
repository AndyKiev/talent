// src/components/admin/department_types/organigram/organigramDrag.ts
//
// Drag-and-drop plumbing shared by the type cards, the job boxes and the
// panels. Two independent drags, one per editing mode (OrganigramMode):
// TYPES drags a type card (its parental link), JOBS drags a job (its
// department-type ↔ job link).
import type { DepartmentType } from '../departmentTypeApi';
import type { ParentalLink } from '../departmentTypeParentalLinkApi';
import type { DepartmentTypeJobLink } from '../departmentTypeJobLinkApi';
import type { Job } from '../../jobs/jobApi';
import type { DeptTypeGraph } from './buildDeptTypeGraph';
import type { OrganigramMode } from './organigramMode';
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

/** A job being dragged: from a job box (with its link) or from the jobs
 *  panel (link null — dropping it always CREATES a link). */
export interface JobDragSource {
    job: Job;
    link: DepartmentTypeJobLink | null;
}

/** Plain drop moves an existing link; Ctrl, or a source without a link, adds. */
export const dropActionFor = (src: { link: unknown | null }, ctrl: boolean): DropAction =>
    src.link == null || ctrl ? 'add' : 'move';

/** Everything the cards need about jobs (boxes + the JOBS drag). */
export interface JobCtx {
    /** type id -> its (visible) job links, by job name. */
    linksByType: Map<number, DepartmentTypeJobLink[]>;
    jobById: Map<number, Job>;
    /** `${typeId}:${jobId}` for ALL job links (the DB unique pair). */
    allPairs: Set<string>;
    /** Node keys whose job box is open. */
    openKeys: Set<string>;
    onToggleBox: (nodeKey: string) => void;
    dragging: JobDragSource | null;
    hover: HoverTarget | null;
    /** Job found by the jobs panel's find-next (row highlighted). */
    highlightJobId: number | null;
    onDragStart: (src: JobDragSource) => void;
    onDragEnd: () => void;
    onHover: (target: HoverTarget | null) => void;
    onDrop: (target: DepartmentType, action: DropAction) => void;
}

export interface OrgCtx {
    getString: GetStringFn;
    graph: DeptTypeGraph;
    mode: OrganigramMode;
    /** TYPES mode — type cards are draggable / droppable. */
    dragMode: boolean;
    dragging: DragSource | null;
    hover: HoverTarget | null;
    /** Card found by a panel's find-next (outlined). */
    highlightKey: string | null;
    onFocus: (nodeKey: string) => void;
    onDragStart: (src: DragSource) => void;
    onDragEnd: () => void;
    onHover: (target: HoverTarget | null) => void;
    onDrop: (target: DepartmentType, action: DropAction) => void;
    jobs: JobCtx;
}

/** A job may be linked to a type unless that pair already exists. */
export const canLinkJob = (jobs: JobCtx, jobId: number, typeId: number): boolean =>
    !jobs.allPairs.has(`${typeId}:${jobId}`);

/** Start a drag; copyMove so a Ctrl drop is not refused. */
export function beginDrag(e: React.DragEvent, label: string) {
    e.dataTransfer.effectAllowed = 'copyMove';
    // Firefox needs data for the drag to start.
    e.dataTransfer.setData('text/plain', label);
}

export const startDrag = (
    e: React.DragEvent,
    src: DragSource,
    onDragStart: (src: DragSource) => void,
) => {
    beginDrag(e, src.type.name);
    onDragStart(src);
};

export const startJobDrag = (
    e: React.DragEvent,
    src: JobDragSource,
    onDragStart: (src: JobDragSource) => void,
) => {
    beginDrag(e, src.job.name);
    onDragStart(src);
};

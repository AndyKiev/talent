// src/components/admin/department_types/organigram/useOrganigramJobs.tsx
//
// The JOBS layer of an organigram (department TYPES or department instances —
// generic over the drawn node; `typeIdOf` says which type a card stands for,
// since job links always live on the type), kept out of the page:
// job data (all jobs + all department-type ↔ job links, one request each),
// which job boxes are open, the jobs panel (items, where each job is drawn,
// find-next), the JOBS-mode drag (state, Unlink bay, corner hint) and the
// confirm dialog with its add / move / unlink mutations.
//
// Moving a job between types = create the new link, then delete the old one
// (the API cannot re-point a link) — the dialog warns about the plan rows
// that deletion cascades.
import { useMemo, useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchJobs, type Job } from '../../jobs/jobApi';
import { fetchDepartmentTypeJobLinks, type DepartmentTypeJobLink } from '../departmentTypeJobLinkApi';
import { useDepartmentTypeJobLinkMutations } from '../useDepartmentTypeJobLinkMutations';
import {
    startJobDrag,
    type DropAction,
    type HoverTarget,
    type JobCtx,
    type JobDragSource,
    type JobDropTarget,
} from './organigramDrag';
import type { FindState, PaletteItem } from './OrganigramPalette';
import { OrganigramDragHint, OrganigramUnlinkBay } from './OrganigramDragOverlays';
import { DepartmentTypeJobLinkDropDialog } from './DepartmentTypeJobLinkDropDialog';
import { DEPARTMENT_TYPE_JOB_LINKS_QK, JOB_QK } from '../../../../utils/queryKeys';
import type { GetStringFn } from '../../../../types/getStringFn';

type Snackbar = { open: boolean; message: string; severity: 'success' | 'error' };

type PendingJobAction =
    | { kind: DropAction; src: JobDragSource; to: JobDropTarget }
    | { kind: 'unlink'; src: JobDragSource };

interface OrgNode<N> {
    key: string;
    children: N[];
}

interface Args<N extends OrgNode<N>> {
    /** JOBS mode active (drag on). */
    active: boolean;
    hideInactive: boolean;
    /** Top nodes of the drawn tree (focus or roots). */
    tops: N[];
    /** The department type a drawn card stands for (its job links). */
    typeIdOf: (node: N) => number;
    typeName: (id: number) => string;
    /** Extra line in the confirm dialog for a change to this type's links
     *  (the department organigram: how many departments it affects). */
    scopeNote?: (typeId: number) => string | null;
    getString: GetStringFn;
    setSnackbar: (s: Snackbar) => void;
}

export function useOrganigramJobs<N extends OrgNode<N>>({
    active,
    hideInactive,
    tops,
    typeIdOf,
    typeName,
    scopeNote,
    getString,
    setSnackbar,
}: Args<N>) {
    const [openKeys, setOpenKeys] = useState<Set<string>>(() => new Set());

    // Neither request blocks the tree: the link rows (job counts on the cards)
    // load in the background, and the heavy jobs list (/jobs ≈ 3 s) only once
    // it is needed — JOBS mode or a job box opened.
    const linksQuery = useQuery({
        queryKey: DEPARTMENT_TYPE_JOB_LINKS_QK,
        queryFn: () => fetchDepartmentTypeJobLinks(),
    });
    const jobsQuery = useQuery({
        queryKey: JOB_QK,
        queryFn: () => fetchJobs(),
        enabled: active || openKeys.size > 0,
    });
    const [dragging, setDragging] = useState<JobDragSource | null>(null);
    const [hover, setHover] = useState<HoverTarget | null>(null);
    const [unlinkHovered, setUnlinkHovered] = useState(false);
    const [pending, setPending] = useState<PendingJobAction | null>(null);
    const [find, setFind] = useState<FindState | null>(null);

    const { createLinkMutation, deleteLinkMutation } = useDepartmentTypeJobLinkMutations({ setSnackbar });

    // ── Derived job data ─────────────────────────────────────────────────
    const { jobById, allPairs, linksByType, usedJobIds } = useMemo(() => {
        const jobs = jobsQuery.data ?? [];
        const links = linksQuery.data ?? [];
        const byId = new Map<number, Job>(jobs.map((j) => [j.id, j]));
        const pairs = new Set<string>();
        const used = new Set<number>();
        const byType = new Map<number, DepartmentTypeJobLink[]>();
        for (const l of links) {
            pairs.add(`${l.department_type_id}:${l.job_id}`);
            used.add(l.job_id);
            const job = byId.get(l.job_id);
            // Before the jobs list arrives only the link's own flag is known.
            if (hideInactive && (!l.is_active || (job != null && !job.is_active))) continue;
            const list = byType.get(l.department_type_id);
            if (list) list.push(l);
            else byType.set(l.department_type_id, [l]);
        }
        const nameOf = (id: number) => byId.get(id)?.name ?? '';
        for (const list of byType.values()) list.sort((a, b) => nameOf(a.job_id).localeCompare(nameOf(b.job_id)));
        return { jobById: byId, allPairs: pairs, linksByType: byType, usedJobIds: used };
    }, [jobsQuery.data, linksQuery.data, hideInactive]);

    // job id -> drawn cards whose type carries it (tree order).
    const occurrences = useMemo(() => {
        const map = new Map<number, string[]>();
        const walk = (n: N) => {
            for (const l of linksByType.get(typeIdOf(n)) ?? []) {
                const list = map.get(l.job_id);
                if (list) list.push(n.key);
                else map.set(l.job_id, [n.key]);
            }
            n.children.forEach(walk);
        };
        tops.forEach(walk);
        return map;
    }, [tops, linksByType, typeIdOf]);

    const items: PaletteItem[] = useMemo(
        () =>
            (jobsQuery.data ?? [])
                .filter((j) => !hideInactive || j.is_active)
                .map((j) => ({ id: j.id, name: j.name, isActive: j.is_active, used: usedJobIds.has(j.id) })),
        [jobsQuery.data, hideInactive, usedJobIds],
    );

    const highlightKey = find ? (occurrences.get(find.id)?.[find.index] ?? null) : null;

    const onFind = (jobId: number, step: 1 | -1) => {
        const keys = occurrences.get(jobId) ?? [];
        if (keys.length === 0) return;
        const n = keys.length;
        const index = find?.id === jobId ? (find.index + step + n) % n : step === 1 ? 0 : n - 1;
        setFind({ id: jobId, index });
        // Open the found card's job box so the highlighted row is visible.
        setOpenKeys((prev) => (prev.has(keys[index]) ? prev : new Set(prev).add(keys[index])));
    };

    const resetDrag = () => {
        setDragging(null);
        setHover(null);
        setUnlinkHovered(false);
    };

    const ctx: JobCtx = {
        linksByType,
        jobById,
        allPairs,
        openKeys,
        onToggleBox: (key) =>
            setOpenKeys((prev) => {
                const next = new Set(prev);
                if (next.has(key)) next.delete(key);
                else next.add(key);
                return next;
            }),
        dragging,
        hover,
        highlightJobId: find?.id ?? null,
        onDragStart: setDragging,
        onDragEnd: resetDrag,
        onHover: setHover,
        onDrop: (to, action) => {
            if (dragging) setPending({ kind: action, src: dragging, to });
            resetDrag();
        },
    };

    // ── Confirm + mutations ─────────────────────────────────────────────
    const close = () => setPending(null);
    const confirm = () => {
        if (!pending) return;
        const { src } = pending;
        if (pending.kind === 'add') {
            createLinkMutation.mutate(
                { department_type_id: pending.to.id, job_id: src.job.id },
                { onSettled: close },
            );
        } else if (pending.kind === 'move' && src.link) {
            const old = src.link;
            createLinkMutation
                .mutateAsync({ department_type_id: pending.to.id, job_id: src.job.id })
                .then(() => deleteLinkMutation.mutateAsync({ linkId: old.id, departmentTypeId: old.department_type_id }))
                .catch(() => undefined) // each mutation already shows its own error snackbar
                .finally(close);
        } else if (pending.kind === 'unlink' && src.link) {
            deleteLinkMutation.mutate(
                { linkId: src.link.id, departmentTypeId: src.link.department_type_id },
                { onSettled: close },
            );
        }
    };

    const dialogText = (): { title: string; message: string } => {
        if (!pending) return { title: '', message: '' };
        const job = pending.src.job.name;
        const from = pending.src.link ? typeName(pending.src.link.department_type_id) : '';
        if (pending.kind === 'unlink')
            return {
                title: getString('deptTypeOrgJobUnlinkTitle'),
                message: getString('deptTypeOrgJobUnlinkMsg', { job, from }),
            };
        const to = pending.to.name;
        return pending.kind === 'move'
            ? {
                  title: getString('deptTypeOrgJobMoveTitle'),
                  message: getString('deptTypeOrgJobMoveMsg', { job, from, to }),
              }
            : {
                  title: getString('deptTypeOrgJobAddTitle'),
                  message: getString('deptTypeOrgJobAddMsg', { job, to }),
              };
    };
    const { title, message } = dialogText();
    // Every type whose links the pending action changes.
    const touchedTypes = !pending
        ? []
        : pending.kind === 'unlink'
          ? [pending.src.link?.department_type_id]
          : [pending.to.id, pending.kind === 'move' ? pending.src.link?.department_type_id : undefined];
    const note = scopeNote
        ? touchedTypes
              .filter((id): id is number => id != null)
              .map(scopeNote)
              .filter((t): t is string => !!t)
              .join(' ')
        : '';

    const overlays: ReactNode = (
        <>
            {active && dragging?.link && (
                <OrganigramUnlinkBay
                    label={getString('deptTypeOrgUnlinkBay', { from: typeName(dragging.link.department_type_id) })}
                    hovered={unlinkHovered}
                    onHover={(h) => {
                        setUnlinkHovered(h);
                        if (h) setHover(null);
                    }}
                    onDrop={() => {
                        setPending({ kind: 'unlink', src: dragging });
                        resetDrag();
                    }}
                />
            )}
            {active && dragging && (
                <OrganigramDragHint
                    title={dragging.job.name}
                    action={
                        unlinkHovered
                            ? getString('deptTypeOrgActionUnlink')
                            : hover
                              ? getString(hover.action === 'add' ? 'deptTypeOrgJobActionAdd' : 'deptTypeOrgActionMove')
                              : null
                    }
                    actionColor={unlinkHovered ? 'warning' : 'success'}
                    text={
                        hover
                            ? hover.type.name
                            : getString(dragging.link ? 'deptTypeOrgJobDropHintIdle' : 'deptTypeOrgJobDropHintIdleNew')
                    }
                    muted={!hover}
                />
            )}
            <DepartmentTypeJobLinkDropDialog
                kind={pending?.kind ?? null}
                title={title}
                message={message}
                note={note || null}
                deletedLinkId={pending && pending.kind !== 'add' ? (pending.src.link?.id ?? null) : null}
                isPending={createLinkMutation.isPending || deleteLinkMutation.isPending}
                onConfirm={confirm}
                onClose={close}
                getString={getString}
            />
        </>
    );

    return {
        ctx,
        items,
        occurrences,
        find,
        onFind,
        clearFind: () => setFind(null),
        highlightKey,
        resetDrag,
        onPaletteDragStart: (e: React.DragEvent, jobId: number) => {
            const job = jobById.get(jobId);
            if (job) startJobDrag(e, { job, link: null }, setDragging);
        },
        overlays,
        /** Jobs list still loading (JOBS mode / an open box are waiting). */
        jobsLoading: jobsQuery.isFetching && !jobsQuery.data,
        error: jobsQuery.error ?? linksQuery.error,
    };
}

// src/components/admin/department_types/organigram/DepartmentTypeOrganigram.tsx
//
// Organigram of department TYPES (not department instances) — a second view
// of the same parental links the `hierarchy` tab edits.
//
// Classic org chart, one row per level (the bottom row stacks vertically).
// The top view draws every root type (no parent, has children) as its own
// tree, N rows deep top row included (N = app setting
// `department_type_organigram_depth`, overridable per browser). Clicking a
// card FOCUSES it: it moves to the top, N rows deep. The way back up is always
// visible — an "up" strip lists the focused type's parent(s) as chips, and a
// breadcrumb holds the clicked path from the top. The path lives in the URL (?path=1_5_12) so browser Back works too.
//
// Mode selector (header): VIEW / TYPES (blue) / JOBS (green) — one kind of
// link is edited at a time.
//   TYPES: drop a card on another card -> MOVE its link to that parent;
//          Ctrl + drop -> ADD that card as an extra parent; the Unlink bay
//          removes the link; a types-panel chip or a top card always ADDS.
//          Cycles and duplicate pairs are not droppable (backend rejects too).
//   JOBS:  the job-count chip opens a card's job box (in any mode); in JOBS
//          mode its rows drag: drop on a card = move the job link there,
//          Ctrl = link it there too, Unlink bay = remove; a jobs-panel chip
//          always ADDS (useOrganigramJobs).
// Every drop is confirmed in a dialog.
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useSearch } from '@tanstack/react-router';
import {
    Alert,
    Box,
    Breadcrumbs,
    Button,
    Chip,
    CircularProgress,
    FormControlLabel,
    Link,
    MenuItem,
    Paper,
    Select,
    Snackbar,
    Switch,
    ToggleButton,
    ToggleButtonGroup,
    Tooltip,
    Typography,
} from '@mui/material';
import AccountTreeOutlinedIcon from '@mui/icons-material/AccountTreeOutlined';
import AlignHorizontalLeftIcon from '@mui/icons-material/AlignHorizontalLeft';
import AlignVerticalTopIcon from '@mui/icons-material/AlignVerticalTop';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import HomeOutlinedIcon from '@mui/icons-material/HomeOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import WorkOutlineIcon from '@mui/icons-material/WorkOutline';
import VerticalAlignTopIcon from '@mui/icons-material/VerticalAlignTop';

import { fetchDepartmentTypes, type DepartmentType } from '../departmentTypeApi';
import { fetchParentalLinks } from '../departmentTypeParentalLinkApi';
import { useDepartmentTypeLinkMutations } from '../useDepartmentTypeLinkMutations';
import { buildDeptTypeGraph, buildSubtree, chainTo, type TypeTreeNode } from './buildDeptTypeGraph';
import {
    startDrag,
    type DragSource,
    type DropAction,
    type HoverTarget,
    type OrgCtx,
} from './organigramDrag';
import { DepartmentTypeOrganigramTree } from './DepartmentTypeOrganigramTree';
import { OrganigramPalette, type FindState, type PaletteItem } from './OrganigramPalette';
import { OrganigramDragHint, OrganigramUnlinkBay } from './OrganigramDragOverlays';
import { useOrganigramJobs } from './useOrganigramJobs';
import { MODE_COLOR, OrganigramMode, organigramModeLabel } from './organigramMode';
import { JobBoxPlacement, jobBoxPlacementLabel } from './jobBoxPlacement';
import { MAX_DEPTH, MIN_DEPTH, useDeptTypeOrganigramDepth } from './useDeptTypeOrganigramDepth';
import { useDeptTypeOrganigramStore } from '../../../../store/deptTypeOrganigramStore';
import {
    OrganigramOrientation,
    organigramOrientationLabel,
} from '../../../organigram/organigramOrientation';
import ConfirmDialog from '../../../ui/ConfirmDialog';
import useString from '../../../../hooks/useString';
import { DEPARTMENT_TYPE_PARENTAL_LINKS_QK, DEPARTMENT_TYPE_QK } from '../../../../utils/queryKeys.ts';

const MODE_BUTTONS = [
    { value: OrganigramMode.VIEW, Icon: VisibilityOutlinedIcon, color: 'standard' },
    { value: OrganigramMode.TYPES, Icon: AccountTreeOutlinedIcon, color: 'info' },
    { value: OrganigramMode.JOBS, Icon: WorkOutlineIcon, color: 'success' },
] as const;

// Where a job box opens, relative to its card.
const BOX_PLACEMENT_BUTTONS = [
    { value: JobBoxPlacement.RIGHT, Icon: ArrowForwardIcon },
    { value: JobBoxPlacement.LEFT, Icon: ArrowBackIcon },
    { value: JobBoxPlacement.TOP, Icon: ArrowUpwardIcon },
    { value: JobBoxPlacement.BOTTOM, Icon: ArrowDownwardIcon },
] as const;

const ROUTE_ID = '/admin/departments_group/department_types/organigram/';
const ROUTE_PATH = '/admin/departments_group/department_types/organigram';

type PendingAction =
    | { kind: DropAction; src: DragSource; to: DepartmentType }
    | { kind: 'unlink'; src: DragSource };

const typeIdOfNode = (n: TypeTreeNode) => n.type.id;

const parsePath = (raw: string | undefined): number[] =>
    (raw ?? '')
        .split('_')
        .map(Number)
        .filter((n) => Number.isInteger(n) && n > 0);

export function DepartmentTypeOrganigram() {
    const getString = useString();
    const navigate = useNavigate();
    const search = useSearch({ from: ROUTE_ID });

    const { depth, setDepth } = useDeptTypeOrganigramDepth();
    const hideInactive = useDeptTypeOrganigramStore((s) => s.hideInactive);
    const setHideInactive = useDeptTypeOrganigramStore((s) => s.setHideInactive);
    const orientation = useDeptTypeOrganigramStore((s) => s.orientation);
    const setOrientation = useDeptTypeOrganigramStore((s) => s.setOrientation);
    const paletteUsage = useDeptTypeOrganigramStore((s) => s.paletteUsage);
    const setPaletteUsage = useDeptTypeOrganigramStore((s) => s.setPaletteUsage);
    const paletteSort = useDeptTypeOrganigramStore((s) => s.paletteSort);
    const setPaletteSort = useDeptTypeOrganigramStore((s) => s.setPaletteSort);
    const jobPaletteUsage = useDeptTypeOrganigramStore((s) => s.jobPaletteUsage);
    const setJobPaletteUsage = useDeptTypeOrganigramStore((s) => s.setJobPaletteUsage);
    const jobPaletteSort = useDeptTypeOrganigramStore((s) => s.jobPaletteSort);
    const setJobPaletteSort = useDeptTypeOrganigramStore((s) => s.setJobPaletteSort);
    const jobBoxPlacement = useDeptTypeOrganigramStore((s) => s.jobBoxPlacement);
    const setJobBoxPlacement = useDeptTypeOrganigramStore((s) => s.setJobBoxPlacement);

    const [mode, setMode] = useState<OrganigramMode>(OrganigramMode.VIEW);
    const dragMode = mode === OrganigramMode.TYPES;
    const [dragging, setDragging] = useState<DragSource | null>(null);
    const [hover, setHover] = useState<HoverTarget | null>(null);
    const [unlinkHovered, setUnlinkHovered] = useState(false);
    const [find, setFind] = useState<FindState | null>(null);
    const [pending, setPending] = useState<PendingAction | null>(null);
    const [snackbar, setSnackbar] = useState({
        open: false,
        message: '',
        severity: 'success' as 'success' | 'error',
    });

    const typesQuery = useQuery({
        queryKey: DEPARTMENT_TYPE_QK,
        queryFn: () => fetchDepartmentTypes(),
        staleTime: 2 * 60 * 1000,
    });
    const linksQuery = useQuery({
        queryKey: DEPARTMENT_TYPE_PARENTAL_LINKS_QK,
        queryFn: () => fetchParentalLinks(),
    });

    const { createLinkMutation, updateLinkMutation, deleteLinkMutation } =
        useDepartmentTypeLinkMutations({ setSnackbar });

    const graph = useMemo(
        () => buildDeptTypeGraph(typesQuery.data ?? [], linksQuery.data ?? [], hideInactive),
        [typesQuery.data, linksQuery.data, hideInactive],
    );

    // Clicked path from the top; unknown (deleted / hidden) ids are dropped.
    const path = useMemo(
        () => parsePath(search.path).filter((id) => graph.typeById.has(id)),
        [search.path, graph],
    );
    const focusId = path.length > 0 ? path[path.length - 1] : null;

    const setPath = (next: number[]) => {
        setFind(null);
        jobsLayer.clearFind();
        return navigate({
            to: ROUTE_PATH,
            search: { path: next.length > 0 ? next.join('_') : undefined },
        });
    };

    const focusNode: TypeTreeNode | null = useMemo(
        () => (focusId == null ? null : buildSubtree(graph, focusId, null, depth - 1)),
        [graph, focusId, depth],
    );
    const rootNodes = useMemo(
        () =>
            focusId != null
                ? []
                : graph.roots
                      .map((r) => buildSubtree(graph, r.id, null, depth - 1))
                      .filter((n): n is TypeTreeNode => n != null),
        [graph, focusId, depth],
    );

    const focusParents = focusId == null ? [] : (graph.parentLinks.get(focusId) ?? []);
    // Types panel data: visible types, and where each one is drawn (tree
    // order) for the find-next navigation.
    const typeItems: PaletteItem[] = useMemo(
        () =>
            [...graph.typeById.values()]
                .filter((t) => !hideInactive || t.is_active)
                .map((t) => ({
                    id: t.id,
                    name: t.name,
                    isActive: t.is_active,
                    used: graph.childLinks.has(t.id) || graph.parentLinks.has(t.id),
                })),
        [graph, hideInactive],
    );
    const tops = useMemo(() => (focusNode ? [focusNode] : rootNodes), [focusNode, rootNodes]);
    const occurrences = useMemo(() => {
        const map = new Map<number, string[]>();
        const walk = (n: TypeTreeNode) => {
            const list = map.get(n.type.id);
            if (list) list.push(n.key);
            else map.set(n.type.id, [n.key]);
            n.children.forEach(walk);
        };
        tops.forEach(walk);
        return map;
    }, [tops]);
    const onFind = (typeId: number, step: 1 | -1) => {
        const n = occurrences.get(typeId)?.length ?? 0;
        if (n === 0) return;
        setFind((prev) =>
            prev?.id === typeId
                ? { id: typeId, index: (prev.index + step + n) % n }
                : { id: typeId, index: step === 1 ? 0 : n - 1 },
        );
    };

    const nameOf = (id: number) => graph.typeById.get(id)?.name ?? `#${id}`;

    const jobsLayer = useOrganigramJobs({
        active: mode === OrganigramMode.JOBS,
        hideInactive,
        tops,
        typeIdOf: typeIdOfNode,
        typeName: nameOf,
        getString,
        setSnackbar,
    });

    // The panel on screen follows the mode (jobs in JOBS mode, else types),
    // and so does the find-next highlight.
    const highlightKey =
        mode === OrganigramMode.JOBS
            ? jobsLayer.highlightKey
            : find
              ? (occurrences.get(find.id)?.[find.index] ?? null)
              : null;

    const resetDrag = () => {
        setDragging(null);
        setHover(null);
        setUnlinkHovered(false);
    };

    const ctx: OrgCtx = {
        getString,
        graph,
        mode,
        dragMode,
        dragging,
        hover,
        highlightKey,
        // A node key is `/a/b/c` from the top of the drawn tree; in the focus
        // view that top is the focus itself (already the last path element).
        onFocus: (nodeKey) => {
            const ids = parsePath(nodeKey.split('/').join('_'));
            setPath([...path.slice(0, -1), ...ids]);
        },
        onDragStart: setDragging,
        onDragEnd: resetDrag,
        onHover: setHover,
        onDrop: (to, action) => {
            if (dragging) setPending({ kind: action, src: dragging, to });
            resetDrag();
        },
        jobs: jobsLayer.ctx,
    };

    const goUp = (parentId: number) => {
        if (path.length >= 2 && path[path.length - 2] === parentId) setPath(path.slice(0, -1));
        else setPath(chainTo(graph, parentId));
    };

    const confirmPending = () => {
        if (!pending) return;
        const done = { onSettled: () => setPending(null) };
        const { src } = pending;
        if (pending.kind === 'add') {
            createLinkMutation.mutate({ child_id: src.type.id, parent_id: pending.to.id }, done);
        } else if (pending.kind === 'move' && src.link) {
            updateLinkMutation.mutate(
                { linkId: src.link.id, newParentId: pending.to.id, oldParentId: src.link.parent_id },
                done,
            );
        } else if (pending.kind === 'unlink' && src.link) {
            deleteLinkMutation.mutate({ linkId: src.link.id, parentId: src.link.parent_id }, done);
        }
    };

    const pendingText = (): { title: string; message: string } => {
        if (!pending) return { title: '', message: '' };
        const child = pending.src.type.name;
        const from = pending.src.link ? nameOf(pending.src.link.parent_id) : '';
        if (pending.kind === 'unlink')
            return {
                title: getString('deptTypeOrgUnlinkTitle'),
                message: getString('deptTypeOrgUnlinkMsg', { child, from }),
            };
        const to = pending.to.name;
        return pending.kind === 'move'
            ? {
                  title: getString('deptTypeOrgMoveTitle'),
                  message: getString('deptTypeOrgMoveMsg', { child, from, to }),
              }
            : {
                  title: getString('deptTypeOrgAddTitle'),
                  message: getString('deptTypeOrgAddMsg', { child, to }),
              };
    };

    // The job layer never blocks the tree (see useOrganigramJobs).
    const isLoading = typesQuery.isLoading || linksQuery.isLoading;
    const error = typesQuery.error ?? linksQuery.error ?? jobsLayer.error;
    const modeColor = MODE_COLOR[mode];
    const isMutating =
        createLinkMutation.isPending || updateLinkMutation.isPending || deleteLinkMutation.isPending;
    const { title: pendingTitle, message: pendingMessage } = pendingText();

    return (
        <Paper
            elevation={0}
            sx={{
                border: '1px solid',
                borderColor: modeColor === 'inherit' ? 'divider' : `${modeColor}.main`,
                p: 1.5,
            }}
        >
            {/* ── Header: title, orientation, depth, hide inactive, mode ──── */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1, flexWrap: 'wrap' }}>
                <AccountTreeOutlinedIcon color="action" sx={{ fontSize: 18 }} />
                <Typography variant="subtitle2" fontWeight={600} sx={{ flex: 1 }}>
                    {getString('deptTypeOrgTitle')}
                </Typography>
                <ToggleButtonGroup
                    size="small"
                    exclusive
                    value={orientation}
                    onChange={(_, v: OrganigramOrientation | null) => v && setOrientation(v)}
                >
                    {[
                        { value: OrganigramOrientation.TOP_DOWN, icon: <AlignVerticalTopIcon fontSize="small" /> },
                        { value: OrganigramOrientation.LEFT_RIGHT, icon: <AlignHorizontalLeftIcon fontSize="small" /> },
                    ].map(({ value, icon }) => (
                        <ToggleButton key={value} value={value} sx={{ py: 0.5 }}>
                            <Tooltip title={organigramOrientationLabel(value, getString)}>{icon}</Tooltip>
                        </ToggleButton>
                    ))}
                </ToggleButtonGroup>
                <ToggleButtonGroup
                    size="small"
                    exclusive
                    color="success"
                    value={jobBoxPlacement}
                    onChange={(_, v: JobBoxPlacement | null) => v && setJobBoxPlacement(v)}
                >
                    {BOX_PLACEMENT_BUTTONS.map(({ value, Icon }) => (
                        <ToggleButton key={value} value={value} sx={{ py: 0.5, px: 0.75 }}>
                            <Tooltip title={jobBoxPlacementLabel(value, getString)}>
                                <Icon sx={{ fontSize: 16 }} />
                            </Tooltip>
                        </ToggleButton>
                    ))}
                </ToggleButtonGroup>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body2">{getString('deptTypeOrgDepth')}</Typography>
                    <Select
                        variant="outlined"
                        size="small"
                        value={depth}
                        onChange={(e) => setDepth(Number(e.target.value))}
                        sx={{ minWidth: 64 }}
                    >
                        {Array.from({ length: MAX_DEPTH - MIN_DEPTH + 1 }, (_, i) => MIN_DEPTH + i).map(
                            (n) => (
                                <MenuItem key={n} value={n}>
                                    {n}
                                </MenuItem>
                            ),
                        )}
                    </Select>
                </Box>
                <FormControlLabel
                    control={
                        <Switch
                            size="small"
                            checked={hideInactive}
                            onChange={(e) => setHideInactive(e.target.checked)}
                        />
                    }
                    label={<Typography variant="body2">{getString('deptTypeOrgHideInactive')}</Typography>}
                />
                <ToggleButtonGroup
                    size="small"
                    exclusive
                    value={mode}
                    onChange={(_, v: OrganigramMode | null) => {
                        if (!v) return;
                        setMode(v);
                        resetDrag();
                        jobsLayer.resetDrag();
                    }}
                >
                    {MODE_BUTTONS.map(({ value, Icon, color }) => (
                        <ToggleButton key={value} value={value} color={color} sx={{ py: 0.5, gap: 0.5 }}>
                            <Icon fontSize="small" />
                            <Typography variant="caption" sx={{ textTransform: 'none' }}>
                                {organigramModeLabel(value, getString)}
                            </Typography>
                        </ToggleButton>
                    ))}
                </ToggleButtonGroup>
            </Box>

            {/* ── Breadcrumb: the clicked path from the top ───────────────── */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, minHeight: 32 }}>
                <Breadcrumbs sx={{ flex: 1 }}>
                    {focusId == null ? (
                        <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <HomeOutlinedIcon sx={{ fontSize: 16 }} />
                            {getString('deptTypeOrgTop')}
                        </Typography>
                    ) : (
                        <Link
                            component="button"
                            variant="body2"
                            underline="hover"
                            onClick={() => setPath([])}
                            sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
                        >
                            <HomeOutlinedIcon sx={{ fontSize: 16 }} />
                            {getString('deptTypeOrgTop')}
                        </Link>
                    )}
                    {path.map((id, i) =>
                        i === path.length - 1 ? (
                            <Typography key={i} variant="body2" fontWeight={600}>
                                {nameOf(id)}
                            </Typography>
                        ) : (
                            <Link
                                key={i}
                                component="button"
                                variant="body2"
                                underline="hover"
                                onClick={() => setPath(path.slice(0, i + 1))}
                            >
                                {nameOf(id)}
                            </Link>
                        ),
                    )}
                </Breadcrumbs>
                {focusId != null && (
                    <Button
                        size="small"
                        startIcon={<VerticalAlignTopIcon />}
                        onClick={() => setPath([])}
                    >
                        {getString('deptTypeOrgToTop')}
                    </Button>
                )}
            </Box>

            {/* ── Up strip: the focused type's parents (the way back up) ──── */}
            {focusId != null && (
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 1,
                        flexWrap: 'wrap',
                        mb: 1,
                        p: 1,
                        borderRadius: 1,
                        bgcolor: 'action.hover',
                    }}
                >
                    <ArrowUpwardIcon color="action" sx={{ fontSize: 18 }} />
                    <Typography variant="body2" color="text.secondary">
                        {getString('deptTypeOrgParents')}
                    </Typography>
                    {focusParents.length === 0 ? (
                        <Chip
                            size="small"
                            icon={<HomeOutlinedIcon />}
                            label={getString('deptTypeOrgTopLevel')}
                            onClick={() => setPath([])}
                        />
                    ) : (
                        focusParents.map((l) => (
                            <Tooltip key={l.id} title={getString('deptTypeOrgGoUpHint')}>
                                <Chip
                                    size="small"
                                    icon={<ArrowUpwardIcon />}
                                    label={nameOf(l.parent_id)}
                                    variant={l.is_active ? 'filled' : 'outlined'}
                                    color="primary"
                                    onClick={() => goUp(l.parent_id)}
                                    sx={{ ...(!l.is_active && { opacity: 0.6 }) }}
                                />
                            </Tooltip>
                        ))
                    )}
                </Box>
            )}

            {/* ── Panel: jobs in JOBS mode, otherwise types ─────────────── */}
            {mode === OrganigramMode.JOBS ? (
                <OrganigramPalette
                    items={jobsLayer.items}
                    occurrences={jobsLayer.occurrences}
                    usage={jobPaletteUsage}
                    onUsageChange={setJobPaletteUsage}
                    sort={jobPaletteSort}
                    onSortChange={setJobPaletteSort}
                    accent="success"
                    title={
                        jobsLayer.jobsLoading
                            ? getString('deptTypeOrgJobsLoading')
                            : getString('deptTypeOrgJobsPanel', { count: jobsLayer.items.length })
                    }
                    filterPlaceholder={getString('deptTypeOrgFilterJobs')}
                    emptyText={getString('deptTypeOrgNoMatchingJobs')}
                    hint={getString('deptTypeOrgJobPalette')}
                    usedHint={(count) => getString('deptTypeOrgJobUsedHint', { count })}
                    unusedHint={getString('deptTypeOrgJobUnusedHint')}
                    draggable
                    find={jobsLayer.find}
                    onFind={jobsLayer.onFind}
                    onItemDragStart={jobsLayer.onPaletteDragStart}
                    onDragEnd={jobsLayer.resetDrag}
                    getString={getString}
                />
            ) : (
                <OrganigramPalette
                    items={typeItems}
                    occurrences={occurrences}
                    usage={paletteUsage}
                    onUsageChange={setPaletteUsage}
                    sort={paletteSort}
                    onSortChange={setPaletteSort}
                    accent="info"
                    title={getString('deptTypeOrgTypesPanel', { count: typeItems.length })}
                    filterPlaceholder={getString('filterByDepartmentTypeName')}
                    emptyText={getString('noMatchingDepartmentTypes')}
                    hint={getString(dragMode ? 'deptTypeOrgPalette' : 'deptTypeOrgFindHint')}
                    usedHint={(count) => getString('deptTypeOrgUsedHint', { count })}
                    unusedHint={getString('deptTypeOrgUnusedHint')}
                    draggable={dragMode}
                    find={find}
                    onFind={onFind}
                    onItemDragStart={(e, id) => {
                        const t = graph.typeById.get(id);
                        if (t) startDrag(e, { type: t, link: null }, setDragging);
                    }}
                    onDragEnd={resetDrag}
                    getString={getString}
                />
            )}

            {isLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                    <CircularProgress size={24} />
                </Box>
            ) : error ? (
                <Alert severity="error">{(error as Error).message}</Alert>
            ) : focusNode == null && rootNodes.length === 0 ? (
                <Typography variant="body2" color="text.secondary" align="center" sx={{ p: 4 }}>
                    {getString('noDepartmentTypes')}
                </Typography>
            ) : (
                <DepartmentTypeOrganigramTree
                    focus={focusNode}
                    roots={rootNodes}
                    orientation={orientation}
                    highlightKey={highlightKey}
                    ctx={ctx}
                />
            )}

            {/* ── TYPES drag overlays: Unlink bay + corner hint ─────────── */}
            {dragMode && dragging?.link && (
                <OrganigramUnlinkBay
                    label={getString('deptTypeOrgUnlinkBay', { from: nameOf(dragging.link.parent_id) })}
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
            {dragMode && dragging && (
                <OrganigramDragHint
                    title={dragging.type.name}
                    action={
                        unlinkHovered
                            ? getString('deptTypeOrgActionUnlink')
                            : hover
                              ? getString(hover.action === 'add' ? 'deptTypeOrgActionAdd' : 'deptTypeOrgActionMove')
                              : null
                    }
                    actionColor={unlinkHovered ? 'warning' : 'info'}
                    text={
                        hover
                            ? hover.type.name
                            : getString(dragging.link ? 'deptTypeOrgDropHintIdle' : 'deptTypeOrgDropHintIdleNew')
                    }
                    muted={!hover}
                />
            )}

            {/* ── JOBS drag overlays + job drop dialog ──────────────────── */}
            {jobsLayer.overlays}

            <ConfirmDialog
                open={pending != null}
                title={pendingTitle}
                message={pendingMessage}
                confirmColor={pending?.kind === 'unlink' ? 'warning' : 'primary'}
                isPending={isMutating}
                onConfirm={confirmPending}
                onClose={() => setPending(null)}
            />

            <Snackbar
                open={snackbar.open}
                autoHideDuration={6000}
                onClose={() => setSnackbar((p) => ({ ...p, open: false }))}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            >
                <Alert
                    severity={snackbar.severity}
                    onClose={() => setSnackbar((p) => ({ ...p, open: false }))}
                    sx={{ width: '100%' }}
                >
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Paper>
    );
}

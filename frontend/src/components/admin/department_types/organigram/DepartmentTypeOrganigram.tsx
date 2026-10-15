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
// Drag mode (header switch):
//   - drop a card on another card  -> MOVE its link to that parent;
//   - Ctrl + drop                  -> ADD that card as an extra parent;
//   - drop on the Unlink bay       -> remove the link it hangs on;
//   - drag a chip from the types panel (DepartmentTypePalette — every type,
//     with filter, unused-only, sort and find-next) or a top card
//                                  -> always ADDS a link.
// Every drop is confirmed in a dialog. Cycles and duplicate pairs are not
// droppable (the backend rejects them too).
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
import HomeOutlinedIcon from '@mui/icons-material/HomeOutlined';
import LinkOffIcon from '@mui/icons-material/LinkOff';
import VerticalAlignTopIcon from '@mui/icons-material/VerticalAlignTop';

import { fetchDepartmentTypes, type DepartmentType } from '../departmentTypeApi';
import { fetchParentalLinks } from '../departmentTypeParentalLinkApi';
import { useDepartmentTypeLinkMutations } from '../useDepartmentTypeLinkMutations';
import { buildDeptTypeGraph, buildSubtree, chainTo, type TypeTreeNode } from './buildDeptTypeGraph';
import {
    type DragSource,
    type DropAction,
    type HoverTarget,
    type OrgCtx,
} from './organigramDrag';
import { DepartmentTypeOrganigramTree } from './DepartmentTypeOrganigramTree';
import { DepartmentTypePalette, type FindState } from './DepartmentTypePalette';
import { MAX_DEPTH, MIN_DEPTH, useDeptTypeOrganigramDepth } from './useDeptTypeOrganigramDepth';
import { useDeptTypeOrganigramStore } from '../../../../store/deptTypeOrganigramStore';
import {
    OrganigramOrientation,
    organigramOrientationLabel,
} from '../../../organigram/organigramOrientation';
import ConfirmDialog from '../../../ui/ConfirmDialog';
import useString from '../../../../hooks/useString';
import cfl from '../../../../utils/helpers.ts';
import { DEPARTMENT_TYPE_PARENTAL_LINKS_QK, DEPARTMENT_TYPE_QK } from '../../../../utils/queryKeys.ts';

const ROUTE_ID = '/admin/departments_group/department_types/organigram/';
const ROUTE_PATH = '/admin/departments_group/department_types/organigram';

type PendingAction =
    | { kind: DropAction; src: DragSource; to: DepartmentType }
    | { kind: 'unlink'; src: DragSource };

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

    const [dragMode, setDragMode] = useState(false);
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
    const visibleTypes = useMemo(
        () => [...graph.typeById.values()].filter((t) => !hideInactive || t.is_active),
        [graph, hideInactive],
    );
    const occurrences = useMemo(() => {
        const map = new Map<number, string[]>();
        const walk = (n: TypeTreeNode) => {
            const list = map.get(n.type.id);
            if (list) list.push(n.key);
            else map.set(n.type.id, [n.key]);
            n.children.forEach(walk);
        };
        (focusNode ? [focusNode] : rootNodes).forEach(walk);
        return map;
    }, [focusNode, rootNodes]);
    const highlightKey = find ? (occurrences.get(find.typeId)?.[find.index] ?? null) : null;
    const onFind = (typeId: number, step: 1 | -1) => {
        const n = occurrences.get(typeId)?.length ?? 0;
        if (n === 0) return;
        setFind((prev) =>
            prev?.typeId === typeId
                ? { typeId, index: (prev.index + step + n) % n }
                : { typeId, index: step === 1 ? 0 : n - 1 },
        );
    };

    const resetDrag = () => {
        setDragging(null);
        setHover(null);
        setUnlinkHovered(false);
    };

    const ctx: OrgCtx = {
        getString,
        graph,
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
    };

    const goUp = (parentId: number) => {
        if (path.length >= 2 && path[path.length - 2] === parentId) setPath(path.slice(0, -1));
        else setPath(chainTo(graph, parentId));
    };

    const nameOf = (id: number) => graph.typeById.get(id)?.name ?? `#${id}`;

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

    const isLoading = typesQuery.isLoading || linksQuery.isLoading;
    const error = typesQuery.error ?? linksQuery.error;
    const isMutating =
        createLinkMutation.isPending || updateLinkMutation.isPending || deleteLinkMutation.isPending;
    const { title: pendingTitle, message: pendingMessage } = pendingText();

    return (
        <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', p: 1.5 }}>
            {/* ── Header: title, orientation, depth, hide inactive, drag mode */}
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
                <FormControlLabel
                    control={
                        <Switch
                            size="small"
                            checked={dragMode}
                            onChange={(e) => {
                                setDragMode(e.target.checked);
                                resetDrag();
                            }}
                        />
                    }
                    label={<Typography variant="body2">{cfl(getString('organigramDragMode'))}</Typography>}
                />
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

            {/* ── Types panel: filter / unused-only / sort, find-next, drag ── */}
            <DepartmentTypePalette
                types={visibleTypes}
                graph={graph}
                occurrences={occurrences}
                dragMode={dragMode}
                find={find}
                onFind={onFind}
                onDragStart={setDragging}
                onDragEnd={resetDrag}
                getString={getString}
            />

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

            {/* ── Unlink bay (bottom-left) — only for a card hanging on a link */}
            {dragMode && dragging?.link && (
                <Paper
                    elevation={6}
                    onDragOver={(e) => {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = 'move';
                        setHover(null);
                        if (!unlinkHovered) setUnlinkHovered(true);
                    }}
                    onDragLeave={() => setUnlinkHovered(false)}
                    onDrop={(e) => {
                        e.preventDefault();
                        setPending({ kind: 'unlink', src: dragging });
                        resetDrag();
                    }}
                    sx={{
                        position: 'fixed',
                        bottom: 16,
                        left: 16,
                        zIndex: (theme) => theme.zIndex.snackbar,
                        p: 1.5,
                        maxWidth: 280,
                        border: '2px dashed',
                        borderColor: unlinkHovered ? 'warning.main' : 'divider',
                        bgcolor: unlinkHovered ? 'action.hover' : 'background.paper',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                    }}
                >
                    <LinkOffIcon fontSize="small" color={unlinkHovered ? 'warning' : 'action'} />
                    <Typography variant="body2">
                        {getString('deptTypeOrgUnlinkBay', { from: nameOf(dragging.link.parent_id) })}
                    </Typography>
                </Paper>
            )}

            {/* ── Corner hint while dragging (never obstructs the drag) ────── */}
            {dragMode && dragging && (
                <Paper
                    elevation={6}
                    sx={{
                        position: 'fixed',
                        bottom: 16,
                        right: 16,
                        zIndex: (theme) => theme.zIndex.snackbar,
                        p: 1.5,
                        maxWidth: 320,
                        pointerEvents: 'none',
                    }}
                >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                        <Typography variant="subtitle2" fontWeight={700} sx={{ flex: 1 }}>
                            {dragging.type.name}
                        </Typography>
                        {hover && (
                            <Chip
                                size="small"
                                label={getString(
                                    hover.action === 'add' ? 'deptTypeOrgActionAdd' : 'deptTypeOrgActionMove',
                                )}
                                color={hover.action === 'add' ? 'success' : 'info'}
                            />
                        )}
                        {unlinkHovered && (
                            <Chip size="small" label={getString('deptTypeOrgActionUnlink')} color="warning" />
                        )}
                    </Box>
                    <Typography variant="body2" color={hover ? 'text.primary' : 'text.secondary'}>
                        {hover
                            ? hover.type.name
                            : getString(dragging.link ? 'deptTypeOrgDropHintIdle' : 'deptTypeOrgDropHintIdleNew')}
                    </Typography>
                </Paper>
            )}

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

// src/components/admin/departments/organigram/DepartmentOrganigram.tsx
//
// Organigram of department INSTANCES (the real structure) вЂ” same look and
// navigation as the department-TYPES organigram, no people. Instances start
// from the type structure (generate subtree) but may deviate from it: a
// department can be re-parented anywhere (no cycles). Whether a department
// still follows the type structure is decided by the BACKEND
// (`matches_type_structure` on every tree node; `move_check` before a move)
// and only shown here вЂ” never computed on the frontend.
//
// Header filters: a MAIN department category (default key 'store' = the
// hypermarkets) and the jump-to list of its instances (resettable). Picking
// a category alone changes nothing; picking an instance FOCUSES it (it
// becomes the top of the tree) вЂ” the same as a double-click. The list obeys
// the "hide inactive" switch (on by default).
//
// Top view: every root department heads its tree, N rows deep (N = app
// setting `department_type_organigram_depth`, overridable per browser).
// Double-click a card to FOCUS it (?focus=<id> in the URL, so Back works);
// the breadcrumb is its parent chain, the up strip its parent.
//
// Modes: VIEW / STRUCTURE (blue) / JOBS (green).
//   STRUCTURE: drag a card onto another card = move it there (confirm dialog
//          with the backend type check); card icons add a child, edit,
//          generate the subtree, delete.
//   JOBS:  exactly like the type organigram (useOrganigramJobs): job box rows
//          drag, drop on a card = move the job link to that card's TYPE,
//          Ctrl = link it there too, Unlink bay = remove; a jobs-panel chip
//          always ADDS. Job links live on the TYPE, so a change applies to
//          every department of that type (the confirm dialog says how many).
// Job boxes (the jobs of the department's TYPE) open from the job chip in
// any mode.
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useSearch } from '@tanstack/react-router';
import {
    Alert,
    Autocomplete,
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
    TextField,
    ToggleButton,
    ToggleButtonGroup,
    Tooltip,
    Typography,
} from '@mui/material';
import AccountTreeOutlinedIcon from '@mui/icons-material/AccountTreeOutlined';
import AlignHorizontalLeftIcon from '@mui/icons-material/AlignHorizontalLeft';
import AlignVerticalTopIcon from '@mui/icons-material/AlignVerticalTop';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import EditNoteIcon from '@mui/icons-material/EditNote';
import HomeOutlinedIcon from '@mui/icons-material/HomeOutlined';
import VerticalAlignTopIcon from '@mui/icons-material/VerticalAlignTop';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import WorkOutlineIcon from '@mui/icons-material/WorkOutline';

import { fetchDepartmentTree, type DepartmentNode } from '../departmentApi';
import { useDepartmentMutations } from '../useDepartmentMutations';
import { DepartmentForm } from '../DepartmentForm';
import { DepartmentEditDialog } from '../DepartmentEditDialog';
import { DepartmentDeleteDialog } from '../DepartmentDeleteDialog';
import { DepartmentGenerateSubtreeDialog } from '../DepartmentGenerateSubtreeDialog';
import { fetchDepartmentTypes } from '../../department_types/departmentTypeApi';
import {
    fetchDepartmentCategories,
    type DepartmentCategory,
} from '../../department_categories/departmentCategoryApi';
import {
    OrganigramPalette,
    type FindState,
    type PaletteItem,
} from '../../department_types/organigram/OrganigramPalette';
import { OrganigramDragHint } from '../../department_types/organigram/OrganigramDragOverlays';
import { useOrganigramJobs } from '../../department_types/organigram/useOrganigramJobs';
import { JobBoxPlacement, jobBoxPlacementLabel } from '../../department_types/organigram/jobBoxPlacement';
import { MAX_DEPTH, MIN_DEPTH } from '../../department_types/organigram/useDeptTypeOrganigramDepth';
import { OrganigramTree } from '../../../organigram/OrganigramTree';
import {
    OrganigramOrientation,
    organigramOrientationLabel,
} from '../../../organigram/organigramOrientation';
import { useDepartmentOrganigramStore } from '../../../../store/departmentOrganigramStore';
import { useIntegerSetting } from '../../../../hooks/useAppSetting';
import useString from '../../../../hooks/useString';
import { DEPARTMENT_CATEGORY_QK, DEPARTMENT_TREE_QK, DEPARTMENT_TYPE_QK } from '../../../../utils/queryKeys';
import cfl from '../../../../utils/helpers.ts';
import {
    buildDepartmentGraph,
    buildDeptSubtree,
    deptChain,
    isInSubtree,
    type DeptTreeNode,
} from './buildDepartmentGraph';
import { DepartmentOrganigramCard, type DeptOrgCtx } from './DepartmentOrganigramCard';
import { DepartmentMoveDialog } from './DepartmentMoveDialog';
import { DEPT_MODE_COLOR, DeptOrganigramMode, deptOrganigramModeLabel } from './deptOrganigramMode';

const ROUTE_ID = '/admin/departments_group/structure/organigram/';
const ROUTE_PATH = '/admin/departments_group/structure/organigram';
const DEFAULT_DEPTH = 3;
// Default category of the header filter (category key = code contract).
const DEFAULT_CATEGORY_KEY = 'store';

const MODE_BUTTONS = [
    { value: DeptOrganigramMode.VIEW, Icon: VisibilityOutlinedIcon, color: 'standard' },
    { value: DeptOrganigramMode.STRUCTURE, Icon: EditNoteIcon, color: 'info' },
    { value: DeptOrganigramMode.JOBS, Icon: WorkOutlineIcon, color: 'success' },
] as const;

const typeIdOfNode = (n: DeptTreeNode) => n.dept.department_type_id;

const BOX_PLACEMENT_BUTTONS = [
    { value: JobBoxPlacement.RIGHT, Icon: ArrowForwardIcon },
    { value: JobBoxPlacement.LEFT, Icon: ArrowBackIcon },
    { value: JobBoxPlacement.TOP, Icon: ArrowUpwardIcon },
    { value: JobBoxPlacement.BOTTOM, Icon: ArrowDownwardIcon },
] as const;

const clampDepth = (n: number) => Math.min(MAX_DEPTH, Math.max(MIN_DEPTH, n));

export function DepartmentOrganigram() {
    const getString = useString();
    const navigate = useNavigate();
    const search = useSearch({ from: ROUTE_ID });

    const { value: settingDepth } = useIntegerSetting('department_type_organigram_depth', DEFAULT_DEPTH);
    const depthOverride = useDepartmentOrganigramStore((s) => s.depth);
    const setDepth = useDepartmentOrganigramStore((s) => s.setDepth);
    const depth = clampDepth(depthOverride ?? settingDepth);
    const hideInactive = useDepartmentOrganigramStore((s) => s.hideInactive);
    const setHideInactive = useDepartmentOrganigramStore((s) => s.setHideInactive);
    const orientation = useDepartmentOrganigramStore((s) => s.orientation);
    const setOrientation = useDepartmentOrganigramStore((s) => s.setOrientation);
    const overrides = useDepartmentOrganigramStore((s) => s.layoutOverrides);
    const setLayoutOverride = useDepartmentOrganigramStore((s) => s.setLayoutOverride);
    const paletteUsage = useDepartmentOrganigramStore((s) => s.paletteUsage);
    const setPaletteUsage = useDepartmentOrganigramStore((s) => s.setPaletteUsage);
    const paletteSort = useDepartmentOrganigramStore((s) => s.paletteSort);
    const setPaletteSort = useDepartmentOrganigramStore((s) => s.setPaletteSort);
    const jobPaletteUsage = useDepartmentOrganigramStore((s) => s.jobPaletteUsage);
    const setJobPaletteUsage = useDepartmentOrganigramStore((s) => s.setJobPaletteUsage);
    const jobPaletteSort = useDepartmentOrganigramStore((s) => s.jobPaletteSort);
    const setJobPaletteSort = useDepartmentOrganigramStore((s) => s.setJobPaletteSort);
    const boxPlacement = useDepartmentOrganigramStore((s) => s.jobBoxPlacement);
    const setBoxPlacement = useDepartmentOrganigramStore((s) => s.setJobBoxPlacement);
    const storedCategoryId = useDepartmentOrganigramStore((s) => s.categoryId);
    const setCategoryId = useDepartmentOrganigramStore((s) => s.setCategoryId);

    const [mode, setMode] = useState<DeptOrganigramMode>(DeptOrganigramMode.VIEW);
    const editMode = mode === DeptOrganigramMode.STRUCTURE;
    const jobsMode = mode === DeptOrganigramMode.JOBS;
    const [dragging, setDragging] = useState<DepartmentNode | null>(null);
    const [hoverKey, setHoverKey] = useState<string | null>(null);
    const [hoverName, setHoverName] = useState<string | null>(null);
    const [find, setFind] = useState<FindState | null>(null);
    const [pendingMove, setPendingMove] = useState<{ dept: DepartmentNode; to: DepartmentNode } | null>(null);
    const [createParent, setCreateParent] = useState<DepartmentNode | null>(null);
    const [editing, setEditing] = useState<DepartmentNode | null>(null);
    const [deleting, setDeleting] = useState<DepartmentNode | null>(null);
    const [generating, setGenerating] = useState<DepartmentNode | null>(null);
    const [snackbar, setSnackbar] = useState({
        open: false,
        message: '',
        severity: 'success' as 'success' | 'error',
    });

    // в”Ђв”Ђ Data в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ
    const treeQuery = useQuery({
        queryKey: DEPARTMENT_TREE_QK,
        queryFn: fetchDepartmentTree,
        staleTime: 2 * 60 * 1000,
    });
    const typesQuery = useQuery({
        queryKey: DEPARTMENT_TYPE_QK,
        queryFn: () => fetchDepartmentTypes(),
        staleTime: 2 * 60 * 1000,
    });

    const categoriesQuery = useQuery({
        queryKey: DEPARTMENT_CATEGORY_QK,
        queryFn: () => fetchDepartmentCategories(),
        staleTime: 5 * 60 * 1000,
    });

    const { createMutation, updateMutation, deleteMutation, generateSubtreeMutation } =
        useDepartmentMutations({
            setSnackbar,
            onCreateSuccess: () => setCreateParent(null),
            onUpdateSuccess: () => {
                setEditing(null);
                setPendingMove(null);
            },
            onDeleteSuccess: () => setDeleting(null),
            onDeleteError: () => setDeleting(null),
            onGenerateSuccess: () => setGenerating(null),
            onGenerateError: () => setGenerating(null),
        });

    const graph = useMemo(
        () => buildDepartmentGraph(treeQuery.data ?? [], hideInactive),
        [treeQuery.data, hideInactive],
    );

    // в”Ђв”Ђ Focus (single parent: the breadcrumb is the parent chain) в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ
    const focusDept = search.focus != null ? (graph.deptById.get(search.focus) ?? null) : null;
    const chain = useMemo(() => (focusDept ? deptChain(graph, focusDept.id) : []), [graph, focusDept]);
    const focusParent =
        focusDept?.parent_id != null ? (graph.deptById.get(focusDept.parent_id) ?? null) : null;

    // в”Ђв”Ђ Header filters: main category в†’ jump-to instance в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ
    const mainCategories = useMemo(
        () =>
            (categoriesQuery.data ?? [])
                .filter((c) => c.is_main && c.is_active)
                .sort((a, b) => a.name.localeCompare(b.name)),
        [categoriesQuery.data],
    );
    const category: DepartmentCategory | null =
        mainCategories.find((c) => c.id === storedCategoryId) ??
        mainCategories.find((c) => c.key === DEFAULT_CATEGORY_KEY) ??
        null;
    const categoryInstances = useMemo(
        () =>
            category == null
                ? []
                : [...graph.deptById.values()]
                      .filter(
                          (d) =>
                              d.department_category_id === category.id && (!hideInactive || d.is_active),
                      )
                      .sort((a, b) => a.name.localeCompare(b.name)),
        [graph, category, hideInactive],
    );
    // The jump-to value mirrors the focus while it is one of the listed ones.
    const pickedInstance = categoryInstances.find((d) => d.id === focusDept?.id) ?? null;

    const setFocus = (id: number | null) => {
        setFind(null);
        jobsLayer.clearFind();
        return navigate({ to: ROUTE_PATH, search: { focus: id ?? undefined } });
    };

    const tops: DeptTreeNode[] = useMemo(
        () =>
            focusDept
                ? [buildDeptSubtree(graph, focusDept, depth - 1)]
                : graph.roots.map((r) => buildDeptSubtree(graph, r, depth - 1)),
        [graph, focusDept, depth],
    );

    // в”Ђв”Ђ Types panel: find every drawn department of a type в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ
    const occurrences = useMemo(() => {
        const map = new Map<number, string[]>();
        const walk = (n: DeptTreeNode) => {
            const list = map.get(n.dept.department_type_id);
            if (list) list.push(n.key);
            else map.set(n.dept.department_type_id, [n.key]);
            n.children.forEach(walk);
        };
        tops.forEach(walk);
        return map;
    }, [tops]);
    const typeItems: PaletteItem[] = useMemo(() => {
        const usedTypes = new Set([...graph.deptById.values()].map((d) => d.department_type_id));
        return (typesQuery.data ?? [])
            .filter((t) => !hideInactive || t.is_active)
            .map((t) => ({ id: t.id, name: t.name, isActive: t.is_active, used: usedTypes.has(t.id) }));
    }, [typesQuery.data, graph, hideInactive]);
    const onFind = (typeId: number, step: 1 | -1) => {
        const n = occurrences.get(typeId)?.length ?? 0;
        if (n === 0) return;
        setFind((prev) =>
            prev?.id === typeId
                ? { id: typeId, index: (prev.index + step + n) % n }
                : { id: typeId, index: step === 1 ? 0 : n - 1 },
        );
    };
    // в”Ђв”Ђ Jobs layer (links live on the TYPE of each card) в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ
    const typeNameById = useMemo(
        () => new Map((typesQuery.data ?? []).map((t) => [t.id, t.name])),
        [typesQuery.data],
    );
    const deptCountByType = useMemo(() => {
        const map = new Map<number, number>();
        for (const d of graph.deptById.values())
            map.set(d.department_type_id, (map.get(d.department_type_id) ?? 0) + 1);
        return map;
    }, [graph]);
    const typeName = (id: number) => typeNameById.get(id) ?? `#${id}`;
    const jobsLayer = useOrganigramJobs({
        active: jobsMode,
        hideInactive,
        tops,
        typeIdOf: typeIdOfNode,
        typeName,
        scopeNote: (typeId) =>
            getString('deptOrgJobScopeNote', {
                type: typeName(typeId),
                count: deptCountByType.get(typeId) ?? 0,
            }),
        getString,
        setSnackbar,
    });

    // The panel on screen follows the mode, and so does the find highlight.
    const highlightKey = jobsMode
        ? jobsLayer.highlightKey
        : find
          ? (occurrences.get(find.id)?.[find.index] ?? null)
          : null;

    // в”Ђв”Ђ Drag в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ
    const resetDrag = () => {
        setDragging(null);
        setHoverKey(null);
        setHoverName(null);
    };

    const ctx: DeptOrgCtx = {
        getString,
        editMode,
        jobsMode,
        dragging,
        hoverKey,
        highlightKey,
        // Never onto itself / its own subtree (cycle) or its current parent.
        canDrop: (target) =>
            dragging != null &&
            target.id !== dragging.parent_id &&
            !isInSubtree(graph, dragging.id, target.id),
        onFocus: (id) => setFocus(id),
        onDragStart: setDragging,
        onDragEnd: resetDrag,
        onHover: (key) => {
            setHoverKey(key);
            const id = key ? Number(key.split('/').pop()) : null;
            setHoverName(id != null ? (graph.deptById.get(id)?.name ?? null) : null);
        },
        onDrop: (target) => {
            if (dragging) setPendingMove({ dept: dragging, to: target });
            resetDrag();
        },
        // The ORIGINAL backend nodes: a depth-cut drawn node has no children,
        // and the delete dialog blocks on the real child count.
        onAddChild: (d) => setCreateParent(graph.deptById.get(d.id) ?? d),
        onEdit: (d) => setEditing(graph.deptById.get(d.id) ?? d),
        onGenerate: (d) => setGenerating(graph.deptById.get(d.id) ?? d),
        onDelete: (d) => setDeleting(graph.deptById.get(d.id) ?? d),
        jobs: jobsLayer.ctx,
        boxPlacement,
    };

    const nameOf = (id: number | null) => (id != null ? (graph.deptById.get(id)?.name ?? `#${id}`) : '');
    const parentTypeOf = (d: DepartmentNode) =>
        d.parent_id != null ? (graph.deptById.get(d.parent_id)?.department_type_id ?? null) : null;

    const isLoading = treeQuery.isLoading;
    const error = treeQuery.error ?? typesQuery.error ?? jobsLayer.error;
    const modeColor = DEPT_MODE_COLOR[mode];

    return (
        <Paper
            elevation={0}
            sx={{
                border: '1px solid',
                borderColor: modeColor === 'inherit' ? 'divider' : `${modeColor}.main`,
                p: 1.5,
            }}
        >
            {/* в”Ђв”Ђ Header в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1, flexWrap: 'wrap' }}>
                <AccountTreeOutlinedIcon color="action" sx={{ fontSize: 18 }} />
                <Typography variant="subtitle2" fontWeight={600}>
                    {getString('deptOrgTitle')}
                </Typography>
                <Autocomplete
                    size="small"
                    options={mainCategories}
                    value={category}
                    onChange={(_, c) => setCategoryId(c?.id ?? null)}
                    getOptionLabel={(c) => c.name}
                    isOptionEqualToValue={(a, b) => a.id === b.id}
                    disableClearable={category != null}
                    sx={{ width: 190 }}
                    renderInput={(params) => (
                        <TextField {...params} label={cfl(getString('departmentCategory'))} />
                    )}
                />
                <Autocomplete
                    size="small"
                    options={categoryInstances}
                    value={pickedInstance}
                    onChange={(_, d) => setFocus(d?.id ?? null)}
                    getOptionLabel={(d) => d.name}
                    getOptionKey={(d) => d.id}
                    isOptionEqualToValue={(a, b) => a.id === b.id}
                    disabled={category == null}
                    sx={{ width: 240 }}
                    renderInput={(params) => <TextField {...params} label={cfl(getString('department'))} />}
                />
                <Box sx={{ flex: 1 }} />
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
                    value={boxPlacement}
                    onChange={(_, v: JobBoxPlacement | null) => v && setBoxPlacement(v)}
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
                        onChange={(e) => setDepth(clampDepth(Number(e.target.value)))}
                        sx={{ minWidth: 64 }}
                    >
                        {Array.from({ length: MAX_DEPTH - MIN_DEPTH + 1 }, (_, i) => MIN_DEPTH + i).map((n) => (
                            <MenuItem key={n} value={n}>
                                {n}
                            </MenuItem>
                        ))}
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
                    onChange={(_, v: DeptOrganigramMode | null) => {
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
                                {deptOrganigramModeLabel(value, getString)}
                            </Typography>
                        </ToggleButton>
                    ))}
                </ToggleButtonGroup>
            </Box>

            {/* в”Ђв”Ђ Breadcrumb: the focused department's parent chain в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, minHeight: 32 }}>
                <Breadcrumbs sx={{ flex: 1 }}>
                    {focusDept == null ? (
                        <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <HomeOutlinedIcon sx={{ fontSize: 16 }} />
                            {getString('deptTypeOrgTop')}
                        </Typography>
                    ) : (
                        <Link
                            component="button"
                            variant="body2"
                            underline="hover"
                            onClick={() => setFocus(null)}
                            sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
                        >
                            <HomeOutlinedIcon sx={{ fontSize: 16 }} />
                            {getString('deptTypeOrgTop')}
                        </Link>
                    )}
                    {chain.map((d, i) =>
                        i === chain.length - 1 ? (
                            <Typography key={d.id} variant="body2" fontWeight={600}>
                                {d.name}
                            </Typography>
                        ) : (
                            <Link
                                key={d.id}
                                component="button"
                                variant="body2"
                                underline="hover"
                                onClick={() => setFocus(d.id)}
                            >
                                {d.name}
                            </Link>
                        ),
                    )}
                </Breadcrumbs>
                {focusDept != null && (
                    <Button size="small" startIcon={<VerticalAlignTopIcon />} onClick={() => setFocus(null)}>
                        {getString('deptTypeOrgToTop')}
                    </Button>
                )}
            </Box>

            {/* в”Ђв”Ђ Up strip: the focused department's parent в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ */}
            {focusDept != null && (
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 1,
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
                    {focusParent == null ? (
                        <Chip
                            size="small"
                            icon={<HomeOutlinedIcon />}
                            label={getString('deptTypeOrgTopLevel')}
                            onClick={() => setFocus(null)}
                        />
                    ) : (
                        <Tooltip title={getString('deptOrgGoUpHint')}>
                            <Chip
                                size="small"
                                icon={<ArrowUpwardIcon />}
                                label={focusParent.name}
                                color="primary"
                                onClick={() => setFocus(focusParent.id)}
                            />
                        </Tooltip>
                    )}
                </Box>
            )}

            {/* в”Ђв”Ђ Panel: jobs in JOBS mode, otherwise types (find) в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ */}
            {jobsMode ? (
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
                    hint={getString('deptOrgJobPalette')}
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
                hint={getString('deptTypeOrgFindHint')}
                usedHint={(count) => getString('deptOrgTypeUsedHint', { count })}
                unusedHint={getString('deptOrgTypeUnusedHint')}
                draggable={false}
                find={find}
                onFind={onFind}
                onItemDragStart={() => undefined}
                onDragEnd={() => undefined}
                getString={getString}
            />
            )}

            {isLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                    <CircularProgress size={24} />
                </Box>
            ) : error ? (
                <Alert severity="error">{(error as Error).message}</Alert>
            ) : tops.length === 0 ? (
                <Typography variant="body2" color="text.secondary" align="center" sx={{ p: 4 }}>
                    {getString('deptOrgEmpty')}
                </Typography>
            ) : (
                <OrganigramTree<DeptTreeNode>
                    focus={focusDept ? tops[0] : null}
                    roots={focusDept ? [] : tops}
                    orientation={orientation}
                    highlightKey={highlightKey}
                    overrides={overrides}
                    setLayoutOverride={setLayoutOverride}
                    layoutIdOf={(n) => n.dept.id}
                    isDashed={(n) => !n.dept.is_active}
                    renderCard={(n, slot) => <DepartmentOrganigramCard node={n} ctx={ctx} slot={slot} />}
                />
            )}

            {editMode && dragging && (
                <OrganigramDragHint
                    title={dragging.name}
                    action={hoverName ? getString('deptTypeOrgActionMove') : null}
                    actionColor="info"
                    text={hoverName ?? getString('deptOrgDropHintIdle')}
                    muted={!hoverName}
                />
            )}

            {/* в”Ђв”Ђ JOBS drag overlays + job drop dialog в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ */}
            {jobsLayer.overlays}

            {/* в”Ђв”Ђ Dialogs (mounted only while open) в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ */}
            {pendingMove && (
                <DepartmentMoveDialog
                    dept={pendingMove.dept}
                    from={nameOf(pendingMove.dept.parent_id)}
                    to={pendingMove.to}
                    isPending={updateMutation.isPending}
                    onConfirm={() =>
                        updateMutation.mutate({
                            id: pendingMove.dept.id,
                            data: { parent_id: pendingMove.to.id },
                        })
                    }
                    onClose={() => setPendingMove(null)}
                    getString={getString}
                />
            )}
            {createParent && (
                <DepartmentForm
                    open
                    onClose={() => setCreateParent(null)}
                    parentNode={createParent}
                    createMutation={createMutation}
                />
            )}
            {editing && (
                <DepartmentEditDialog
                    dept={editing}
                    parentTypeId={parentTypeOf(editing)}
                    onClose={() => setEditing(null)}
                    updateMutation={updateMutation}
                />
            )}
            <DepartmentDeleteDialog
                node={deleting}
                isPending={deleteMutation.isPending}
                onConfirm={() => deleting && deleteMutation.mutate(deleting.id)}
                onCancel={() => setDeleting(null)}
            />
            <DepartmentGenerateSubtreeDialog
                node={generating}
                isPending={generateSubtreeMutation.isPending}
                onConfirm={() => generating && generateSubtreeMutation.mutate(generating.id)}
                onCancel={() => setGenerating(null)}
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

// src/components/admin/department_types/DepartmentTypeJobLinkBoard.tsx
//
// Drag-and-drop linking board — the fast alternative to the row-based
// job-links tab. Pick a department type, then move jobs between two panels
// (a transfer-list hybrid):
//   - LEFT: every job (compact chips: name, tooltip = key; searchable).
//     Jobs stay listed forever — one job can link to several types.
//   - RIGHT: a big box with the chips of the jobs linked to the picked type;
//     the chip's ✕ unlinks, dragging a chip back to the left panel too.
// Move jobs by DRAGGING a chip across, or click-select chips (multi) and use
// the → / ← arrows (the classic MUI transfer-list pattern).
//
// Switches:
//   - confirm add / confirm remove — per-action confirmation dialogs
//     (remove defaults ON: deleting a link cascades its headcount targets);
//   - BATCH mode — drops just edit the box locally with no requests or
//     dialogs; a pending "+N / −N" summary appears and the Apply button
//     syncs the whole box in ONE bulk call (create missing, delete absent).
import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    Alert,
    Autocomplete,
    Box,
    Button,
    Chip,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    FormControlLabel,
    IconButton,
    InputAdornment,
    Paper,
    Snackbar,
    Switch,
    TextField,
    Tooltip,
    Typography,
} from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ClearIcon from '@mui/icons-material/Clear';
import SearchIcon from '@mui/icons-material/Search';
import WorkOutlineIcon from '@mui/icons-material/WorkOutline';
import { fetchDepartmentTypes } from './departmentTypeApi';
import { fetchDepartmentTypeChildMap } from '../departments/departmentApi';
import {
    bulkSyncDepartmentTypeJobLinks,
    fetchJobsByDepartmentType,
} from './departmentTypeJobLinkApi';
import {
    deptTypeJobsQK,
    useDepartmentTypeJobLinkMutations,
} from './useDepartmentTypeJobLinkMutations';
import { DepartmentTypeJobLinkDeleteDialog } from './DepartmentTypeJobLinkDeleteDialog';
import { fetchJobs, type Job } from '../jobs/jobApi';
import useString from '../../../hooks/useString';
import cfl from '../../../utils/helpers.ts';
import {
    DEPARTMENT_TYPE_CHILD_MAP_QK,
    DEPARTMENT_TYPE_QK,
    JOB_QK,
} from '../../../utils/queryKeys.ts';

type Side = 'available' | 'linked';

export function DepartmentTypeJobLinkBoard() {
    const getString = useString();
    const qc = useQueryClient();

    const [typeId, setTypeId] = useState<number | ''>('');
    const [search, setSearch] = useState('');
    // Controlled text of the department-type search combobox.
    const [typeInput, setTypeInput] = useState('');

    // Confirmation switches (batch mode silences both).
    const [confirmAdd, setConfirmAdd] = useState(false);
    const [confirmRemove, setConfirmRemove] = useState(true);
    const [batchMode, setBatchMode] = useState(false);

    // Batch mode: the locally edited box (null = mirror the server state).
    const [boxIds, setBoxIds] = useState<Set<number> | null>(null);

    // Click-to-select (multi) per side — powers the transfer arrows.
    const [selected, setSelected] = useState<{ side: Side; ids: Set<number> }>({
        side: 'available',
        ids: new Set(),
    });

    // Chip being dragged: id + which side it came from.
    const [drag, setDrag] = useState<{ side: Side; jobId: number } | null>(null);
    const [dragOverSide, setDragOverSide] = useState<Side | null>(null);

    // Immediate-mode confirmation targets.
    const [addConfirm, setAddConfirm] = useState<number[] | null>(null);
    const [removeConfirm, setRemoveConfirm] = useState<number[] | null>(null);

    const [snackbar, setSnackbar] = useState({
        open: false,
        message: '',
        severity: 'success' as 'success' | 'error',
    });

    // ── Data ─────────────────────────────────────────────────────────────────
    const { data: allTypes = [], isLoading: typesLoading } = useQuery({
        queryKey: DEPARTMENT_TYPE_QK,
        queryFn: () => fetchDepartmentTypes(),
        staleTime: 2 * 60 * 1000,
    });
    const { data: allJobs = [], isLoading: jobsLoading } = useQuery({
        queryKey: JOB_QK,
        queryFn: () => fetchJobs(),
        staleTime: 2 * 60 * 1000,
    });
    const { data: linkedJobs = [], isFetching: linksFetching } = useQuery({
        queryKey: typeId === '' ? ['department_type_jobs', 'idle'] : deptTypeJobsQK(typeId),
        queryFn: () => fetchJobsByDepartmentType(typeId as number),
        enabled: typeId !== '',
    });
    // Parent-type graph ({parent: [children]}, one request) — powers the
    // hierarchy chips inside the type select.
    const { data: typeChildMap = {} } = useQuery({
        queryKey: DEPARTMENT_TYPE_CHILD_MAP_QK,
        queryFn: fetchDepartmentTypeChildMap,
        staleTime: 5 * 60 * 1000,
    });

    const { createLinkMutation, deleteLinkMutation } =
        useDepartmentTypeJobLinkMutations({ setSnackbar });

    const bulkSyncMutation = useMutation({
        mutationFn: (jobIds: number[]) =>
            bulkSyncDepartmentTypeJobLinks(typeId as number, jobIds),
        onSuccess: async (res) => {
            await Promise.all([
                qc.invalidateQueries({ queryKey: deptTypeJobsQK(typeId as number) }),
                qc.invalidateQueries({ queryKey: DEPARTMENT_TYPE_QK }),
                // Deleted links cascade their headcount targets away.
                qc.invalidateQueries({ queryKey: ['headcount_calc'] }),
                qc.invalidateQueries({ queryKey: ['headcount_targets'] }),
                qc.invalidateQueries({ queryKey: ['headcount_organigram'] }),
            ]);
            setBoxIds(null);
            setSnackbar({ open: true, message: res.detail, severity: 'success' });
        },
        onError: (err: Error) =>
            setSnackbar({ open: true, message: err.message, severity: 'error' }),
    });

    // ── Type hierarchy chips ─────────────────────────────────────────────────
    // For every type: its CLOSEST parent type (color1) and its TOP ancestor
    // type below the root (color2), the parentless root itself never shown.
    // When the parent IS that top ancestor, one chip only, in color2.
    const typeAncestors = useMemo(() => {
        const parentByChild = new Map<number, number>();
        for (const [parent, children] of Object.entries(typeChildMap)) {
            for (const child of children) {
                if (!parentByChild.has(child)) parentByChild.set(child, Number(parent));
            }
        }
        const result = new Map<number, { id: number; top: boolean }[]>();
        for (const t of allTypes) {
            const chain: number[] = [];
            const seen = new Set<number>([t.id]);
            let cur = parentByChild.get(t.id);
            while (cur != null && !seen.has(cur)) {
                chain.push(cur);
                seen.add(cur);
                cur = parentByChild.get(cur);
            }
            // chain = [closest parent, …, parentless root]; drop the root.
            const candidates = chain.slice(0, -1);
            if (candidates.length === 0) {
                result.set(t.id, []);
            } else if (candidates.length === 1) {
                result.set(t.id, [{ id: candidates[0], top: true }]);
            } else {
                result.set(t.id, [
                    { id: candidates[0], top: false },
                    { id: candidates[candidates.length - 1], top: true },
                ]);
            }
        }
        return result;
    }, [allTypes, typeChildMap]);

    const typeNameById = useMemo(
        () => new Map(allTypes.map((t) => [t.id, t.name])),
        [allTypes],
    );

    // ── Derived state ────────────────────────────────────────────────────────
    const jobById = useMemo(() => new Map(allJobs.map((j) => [j.id, j])), [allJobs]);
    const serverIds = useMemo(() => new Set(linkedJobs.map((j) => j.id)), [linkedJobs]);
    const linkByJobId = useMemo(
        () => new Map(linkedJobs.map((j) => [j.id, j])),
        [linkedJobs],
    );
    // The box: local edit in batch mode, server truth otherwise.
    const effectiveIds = batchMode && boxIds != null ? boxIds : serverIds;

    const boxJobs = useMemo(
        () =>
            [...effectiveIds]
                .map((id) => jobById.get(id))
                .filter((j): j is Job => j != null)
                .sort((a, b) => a.name.localeCompare(b.name)),
        [effectiveIds, jobById],
    );
    const availableJobs = useMemo(() => {
        const q = search.trim().toLowerCase();
        return allJobs
            .filter((j) => !effectiveIds.has(j.id))
            .filter(
                (j) =>
                    !q ||
                    j.name.toLowerCase().includes(q) ||
                    (j.key ?? '').toLowerCase().includes(q),
            )
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [allJobs, effectiveIds, search]);

    const pendingAdded = useMemo(
        () => [...effectiveIds].filter((id) => !serverIds.has(id)).length,
        [effectiveIds, serverIds],
    );
    const pendingRemoved = useMemo(
        () => [...serverIds].filter((id) => !effectiveIds.has(id)).length,
        [serverIds, effectiveIds],
    );
    const dirty = pendingAdded > 0 || pendingRemoved > 0;

    const typeName = allTypes.find((t) => t.id === typeId)?.name ?? '';

    // ── Actions ──────────────────────────────────────────────────────────────
    const resetLocal = () => {
        setBoxIds(null);
        setSelected({ side: 'available', ids: new Set() });
    };

    const doAdd = (ids: number[]) => {
        ids.forEach((jobId) =>
            createLinkMutation.mutate({
                department_type_id: typeId as number,
                job_id: jobId,
            }),
        );
    };
    const doRemove = (ids: number[]) => {
        ids.forEach((jobId) => {
            const link = linkByJobId.get(jobId);
            if (link) {
                deleteLinkMutation.mutate({
                    linkId: link.link_id,
                    departmentTypeId: typeId as number,
                });
            }
        });
    };

    const addJobs = (ids: number[]) => {
        if (typeId === '' || ids.length === 0) return;
        if (batchMode) {
            setBoxIds((prev) => {
                const next = new Set(prev ?? serverIds);
                ids.forEach((id) => next.add(id));
                return next;
            });
        } else if (confirmAdd) {
            setAddConfirm(ids);
        } else {
            doAdd(ids);
        }
        setSelected({ side: 'available', ids: new Set() });
    };

    const removeJobs = (ids: number[]) => {
        if (typeId === '' || ids.length === 0) return;
        if (batchMode) {
            setBoxIds((prev) => {
                const next = new Set(prev ?? serverIds);
                ids.forEach((id) => next.delete(id));
                return next;
            });
        } else if (confirmRemove) {
            setRemoveConfirm(ids);
        } else {
            doRemove(ids);
        }
        setSelected({ side: 'linked', ids: new Set() });
    };

    const toggleSelect = (side: Side, jobId: number) => {
        setSelected((prev) => {
            const ids = prev.side === side ? new Set(prev.ids) : new Set<number>();
            if (ids.has(jobId)) ids.delete(jobId);
            else ids.add(jobId);
            return { side, ids };
        });
    };

    const jobLabel = (ids: number[]) =>
        ids.map((id) => jobById.get(id)?.name ?? id).join(', ');

    // ── Chip renderers ───────────────────────────────────────────────────────
    const renderChip = (job: Job, side: Side) => {
        const isSelected = selected.side === side && selected.ids.has(job.id);
        const link = side === 'linked' ? linkByJobId.get(job.id) : undefined;
        const pendingNew = side === 'linked' && batchMode && !serverIds.has(job.id);
        const inactiveLink = link != null && !link.link_is_active;
        const chip = (
            <Chip
                label={job.name}
                size="small"
                color={pendingNew ? 'success' : isSelected ? 'primary' : 'default'}
                variant={inactiveLink ? 'outlined' : 'filled'}
                onClick={() => toggleSelect(side, job.id)}
                onDelete={side === 'linked' ? () => removeJobs([job.id]) : undefined}
                draggable
                onDragStart={(e) => {
                    e.dataTransfer.effectAllowed = 'move';
                    e.dataTransfer.setData('text/plain', String(job.id));
                    setDrag({ side, jobId: job.id });
                }}
                onDragEnd={() => {
                    setDrag(null);
                    setDragOverSide(null);
                }}
                sx={{
                    m: 0.25,
                    cursor: 'grab',
                    ...(inactiveLink && { opacity: 0.55 }),
                }}
            />
        );
        return job.key ? (
            <Tooltip key={job.id} title={job.key}>
                {chip}
            </Tooltip>
        ) : (
            <Box key={job.id} component="span">
                {chip}
            </Box>
        );
    };

    const dropProps = (side: Side) => ({
        onDragOver: (e: React.DragEvent) => {
            if (drag && drag.side !== side) {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                if (dragOverSide !== side) setDragOverSide(side);
            }
        },
        onDragLeave: () => {
            if (dragOverSide === side) setDragOverSide(null);
        },
        onDrop: (e: React.DragEvent) => {
            e.preventDefault();
            if (drag && drag.side !== side) {
                if (side === 'linked') addJobs([drag.jobId]);
                else removeJobs([drag.jobId]);
            }
            setDrag(null);
            setDragOverSide(null);
        },
    });

    // ── Render ───────────────────────────────────────────────────────────────
    if (typesLoading || jobsLoading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                <CircularProgress />
            </Box>
        );
    }

    const selectedAvailable =
        selected.side === 'available' ? [...selected.ids] : [];
    const selectedLinked = selected.side === 'linked' ? [...selected.ids] : [];

    return (
        <Box>
            {/* ── Controls row ──────────────────────────────────────────────── */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2, flexWrap: 'wrap' }}>
                {/* Type-to-search combobox: typing in the control itself
                    filters by department-type name. Each option also carries
                    the closest-parent (info) + top-ancestor (warning) chips;
                    the parentless root type is never chipped. */}
                <Autocomplete
                    size="small"
                    sx={{ minWidth: 340 }}
                    options={allTypes}
                    value={allTypes.find((t) => t.id === typeId) ?? null}
                    getOptionLabel={(t) => t.name}
                    isOptionEqualToValue={(o, v) => o.id === v.id}
                    onChange={(_e, val) => {
                        setTypeId(val ? val.id : '');
                        resetLocal();
                    }}
                    // Controlled input text so we can add our own clear ✕ while
                    // typing a filter (MUI's own ✕ handles the selected state).
                    inputValue={typeInput}
                    onInputChange={(_e, val) => setTypeInput(val)}
                    noOptionsText={getString('noMatchingDepartmentTypes') || 'No matches'}
                    // Tall + wide dropdown so long DT names are fully visible
                    // and the list isn't cut to a few rows.
                    slotProps={{ paper: { sx: { minWidth: 560 } } }}
                    ListboxProps={{ style: { maxHeight: '70vh' } }}
                    renderInput={(params) => (
                        <TextField
                            {...params}
                            label={cfl(getString('departmentType'))}
                            placeholder={getString('dtjlBoardFilterTypes')}
                            // Home/End/Ctrl+Home/Ctrl+End must move the text
                            // caret, not the option highlight — stop the
                            // Autocomplete root handler from hijacking them.
                            onKeyDown={(e) => {
                                if (e.key === 'Home' || e.key === 'End') {
                                    e.stopPropagation();
                                }
                            }}
                            InputProps={{
                                ...params.InputProps,
                                endAdornment: (
                                    <>
                                        {/* Typing a filter with nothing selected:
                                            our ✕ wipes the search. Once a type is
                                            selected, MUI's built-in ✕ takes over. */}
                                        {typeInput && typeId === '' ? (
                                            <IconButton
                                                size="small"
                                                aria-label={getString('clear') || 'Clear'}
                                                onClick={() => setTypeInput('')}
                                                sx={{ p: 0.25 }}
                                            >
                                                <ClearIcon fontSize="small" />
                                            </IconButton>
                                        ) : null}
                                        {params.InputProps.endAdornment}
                                    </>
                                ),
                            }}
                        />
                    )}
                    renderOption={(props, t) => {
                        const { key, ...liProps } = props;
                        return (
                            <Box component="li" key={key} {...liProps}>
                                <Box
                                    sx={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 0.75,
                                        minWidth: 0,
                                        width: '100%',
                                    }}
                                >
                                    <Typography variant="body2" sx={{ flex: '1 1 auto' }}>
                                        {t.name}
                                    </Typography>
                                    {(typeAncestors.get(t.id) ?? []).map((a) => (
                                        <Chip
                                            key={a.id}
                                            label={typeNameById.get(a.id) ?? a.id}
                                            size="small"
                                            color={a.top ? 'warning' : 'info'}
                                            variant="outlined"
                                            sx={{
                                                height: 18,
                                                fontSize: '0.65rem',
                                                '& .MuiChip-label': { px: 0.75 },
                                            }}
                                        />
                                    ))}
                                </Box>
                            </Box>
                        );
                    }}
                />
                <Box sx={{ flex: 1 }} />
                <FormControlLabel
                    control={
                        <Switch
                            size="small"
                            checked={confirmAdd}
                            disabled={batchMode}
                            onChange={(e) => setConfirmAdd(e.target.checked)}
                        />
                    }
                    label={
                        <Typography variant="body2">
                            {getString('dtjlBoardConfirmAdd')}
                        </Typography>
                    }
                />
                <FormControlLabel
                    control={
                        <Switch
                            size="small"
                            checked={confirmRemove}
                            disabled={batchMode}
                            onChange={(e) => setConfirmRemove(e.target.checked)}
                        />
                    }
                    label={
                        <Typography variant="body2">
                            {getString('dtjlBoardConfirmRemove')}
                        </Typography>
                    }
                />
                <FormControlLabel
                    control={
                        <Switch
                            size="small"
                            checked={batchMode}
                            onChange={(e) => {
                                setBatchMode(e.target.checked);
                                resetLocal();
                            }}
                        />
                    }
                    label={
                        <Typography variant="body2" fontWeight={600}>
                            {getString('dtjlBoardBatchMode')}
                        </Typography>
                    }
                />
            </Box>

            {typeId === '' ? (
                <Paper
                    elevation={0}
                    sx={{ border: '1px dashed', borderColor: 'divider', p: 6, textAlign: 'center' }}
                >
                    <Typography variant="body2" color="text.secondary">
                        {getString('dtjlBoardSelectTypeFirst')}
                    </Typography>
                </Paper>
            ) : (
                <>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                        {getString('dtjlBoardDragHint')}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'stretch' }}>
                        {/* ── LEFT: all jobs ─────────────────────────────── */}
                        <Paper
                            elevation={0}
                            {...dropProps('available')}
                            sx={{
                                flex: 1,
                                border: '1px solid',
                                borderColor:
                                    dragOverSide === 'available' ? 'error.main' : 'divider',
                                bgcolor:
                                    dragOverSide === 'available' ? 'action.hover' : undefined,
                                borderRadius: 2,
                                p: 1.5,
                                display: 'flex',
                                flexDirection: 'column',
                            }}
                        >
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                <WorkOutlineIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                                <Typography variant="subtitle2" sx={{ flex: 1 }}>
                                    {cfl(getString('dtjlBoardAvailableJobs'))} ({availableJobs.length})
                                </Typography>
                            </Box>
                            <TextField
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder={getString('dtjlBoardFilterJobs')}
                                size="small"
                                fullWidth
                                sx={{ mb: 1 }}
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <SearchIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                                        </InputAdornment>
                                    ),
                                }}
                            />
                            <Box sx={{ overflowY: 'auto', maxHeight: 420, minHeight: 280 }}>
                                {availableJobs.map((j) => renderChip(j, 'available'))}
                            </Box>
                        </Paper>

                        {/* ── Transfer arrows ────────────────────────────── */}
                        <Box
                            sx={{
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'center',
                                gap: 1,
                            }}
                        >
                            <IconButton
                                size="small"
                                disabled={selectedAvailable.length === 0}
                                onClick={() => addJobs(selectedAvailable)}
                                sx={{ border: '1px solid', borderColor: 'divider' }}
                            >
                                <ChevronRightIcon />
                            </IconButton>
                            <IconButton
                                size="small"
                                disabled={selectedLinked.length === 0}
                                onClick={() => removeJobs(selectedLinked)}
                                sx={{ border: '1px solid', borderColor: 'divider' }}
                            >
                                <ChevronLeftIcon />
                            </IconButton>
                        </Box>

                        {/* ── RIGHT: the linked-jobs box ─────────────────── */}
                        <Paper
                            elevation={0}
                            {...dropProps('linked')}
                            sx={{
                                flex: 1.3,
                                border: '2px dashed',
                                borderColor:
                                    dragOverSide === 'linked' ? 'primary.main' : 'divider',
                                bgcolor:
                                    dragOverSide === 'linked' ? 'action.hover' : undefined,
                                borderRadius: 2,
                                p: 1.5,
                                display: 'flex',
                                flexDirection: 'column',
                            }}
                        >
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                <Typography variant="subtitle2" sx={{ flex: 1 }}>
                                    {getString('dtjlBoardLinkedJobs', { type: typeName })} ({boxJobs.length})
                                </Typography>
                                {linksFetching && <CircularProgress size={14} />}
                                {batchMode && dirty && (
                                    <Chip
                                        label={getString('dtjlBoardPending', {
                                            added: pendingAdded,
                                            removed: pendingRemoved,
                                        })}
                                        size="small"
                                        color="warning"
                                        variant="outlined"
                                    />
                                )}
                            </Box>
                            <Box sx={{ overflowY: 'auto', maxHeight: 420, minHeight: 320, flex: 1 }}>
                                {boxJobs.map((j) => renderChip(j, 'linked'))}
                            </Box>
                            {batchMode && (
                                <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end', mt: 1 }}>
                                    <Button
                                        size="small"
                                        disabled={!dirty || bulkSyncMutation.isPending}
                                        onClick={resetLocal}
                                    >
                                        {cfl(getString('dtjlBoardReset'))}
                                    </Button>
                                    <Button
                                        size="small"
                                        variant="contained"
                                        disabled={!dirty || bulkSyncMutation.isPending}
                                        onClick={() => bulkSyncMutation.mutate([...effectiveIds])}
                                    >
                                        {cfl(getString('dtjlBoardApply'))}
                                    </Button>
                                </Box>
                            )}
                        </Paper>
                    </Box>
                </>
            )}

            {/* ── Confirm ADD (immediate mode) ──────────────────────────────── */}
            <Dialog open={addConfirm != null} onClose={() => setAddConfirm(null)} maxWidth="xs" fullWidth>
                <DialogTitle>{cfl(getString('confirm'))}</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        {getString('dtjlBoardAddConfirm', {
                            jobs: jobLabel(addConfirm ?? []),
                            type: typeName,
                        })}
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setAddConfirm(null)}>{getString('cancel')}</Button>
                    <Button
                        variant="contained"
                        onClick={() => {
                            if (addConfirm) doAdd(addConfirm);
                            setAddConfirm(null);
                        }}
                    >
                        {getString('confirm')}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* ── Confirm REMOVE (immediate mode) ───────────────────────────
                Single job → the standard dialog (warns about cascading
                headcount targets); several jobs → a plain list confirm. */}
            {removeConfirm != null && removeConfirm.length === 1 && (
                <DepartmentTypeJobLinkDeleteDialog
                    open
                    linkId={linkByJobId.get(removeConfirm[0])?.link_id ?? 0}
                    jobName={jobById.get(removeConfirm[0])?.name ?? ''}
                    getString={getString}
                    onClose={() => setRemoveConfirm(null)}
                    onConfirm={() => {
                        doRemove(removeConfirm);
                        setRemoveConfirm(null);
                    }}
                    isPending={deleteLinkMutation.isPending}
                />
            )}
            <Dialog
                open={removeConfirm != null && removeConfirm.length > 1}
                onClose={() => setRemoveConfirm(null)}
                maxWidth="xs"
                fullWidth
            >
                <DialogTitle>{cfl(getString('confirmDelete'))}</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        {getString('dtjlBoardRemoveConfirm', {
                            jobs: jobLabel(removeConfirm ?? []),
                            type: typeName,
                        })}
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setRemoveConfirm(null)}>{getString('cancel')}</Button>
                    <Button
                        color="error"
                        variant="contained"
                        onClick={() => {
                            if (removeConfirm) doRemove(removeConfirm);
                            setRemoveConfirm(null);
                        }}
                    >
                        {getString('confirm')}
                    </Button>
                </DialogActions>
            </Dialog>

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
        </Box>
    );
}

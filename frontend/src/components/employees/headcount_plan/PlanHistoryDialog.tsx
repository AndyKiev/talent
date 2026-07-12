// src/components/employees/headcount_plan/PlanHistoryDialog.tsx
//
// Dated target-qty history for one department + job link: dense table of
// every entry (qty | who set it | when | actions), inline qty edit, delete,
// and an add-form (qty may go up OR down, min 0; date picked on the wheel).
import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
    Box,
    Button,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Divider,
    IconButton,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    TextField,
    Tooltip,
    Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EditIcon from '@mui/icons-material/Edit';
import EventIcon from '@mui/icons-material/Event';
import dayjs from 'dayjs';
import type { UseMutationResult } from '@tanstack/react-query';
import {
    fetchHeadcountTargets,
    type DepartmentJobTarget,
    type DepartmentJobTargetCreate,
    type DepartmentJobTargetUpdate,
    type HeadcountCalcRow,
    type MutationResponse,
} from './headcountPlanApi';
import DateWheelDialog from './DateWheelDialog';
import { HEADCOUNT_TARGETS_QK } from '../../../utils/queryKeys';
import { formatDate } from '../../../utils/date';
import type { GetStringFn } from '../../../types/getStringFn';
import cfl from '../../../utils/helpers.ts';

interface Props {
    open: boolean;
    onClose: () => void;
    departmentId: number;
    row: HeadcountCalcRow;
    getString: GetStringFn;
    createTargetMutation: UseMutationResult<
        MutationResponse<DepartmentJobTarget>,
        Error,
        DepartmentJobTargetCreate
    >;
    updateTargetMutation: UseMutationResult<
        MutationResponse<DepartmentJobTarget>,
        Error,
        { targetId: number; data: DepartmentJobTargetUpdate }
    >;
    deleteTargetMutation: UseMutationResult<string, Error, number>;
}

const denseCell = { py: 0.25, px: 1 } as const;
// Header sits lower (shorter) than body rows; actions never wrap so rows stay dense.
const headCell = { py: 0, px: 1, lineHeight: 1.1, fontWeight: 600 } as const;
const actionsCell = { py: 0, px: 1, whiteSpace: 'nowrap' as const, width: 96 };

export function PlanHistoryDialog({
    open,
    onClose,
    departmentId,
    row,
    getString,
    createTargetMutation,
    updateTargetMutation,
    deleteTargetMutation,
}: Props) {
    const [qty, setQty] = useState<string>('');
    const [effectiveDate, setEffectiveDate] = useState<string>(dayjs().format('YYYY-MM-DD'));
    const [dateDialogOpen, setDateDialogOpen] = useState(false);
    // Inline edit of one row's qty.
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editQty, setEditQty] = useState<string>('');

    // Reset the forms whenever the dialog (re)opens for a row.
    useEffect(() => {
        if (open) {
            setQty('');
            setEffectiveDate(dayjs().format('YYYY-MM-DD'));
            setEditingId(null);
        }
    }, [open, row.link_id]);

    const { data: targets = [], isLoading } = useQuery({
        queryKey: HEADCOUNT_TARGETS_QK(departmentId, row.link_id),
        queryFn: () => fetchHeadcountTargets(departmentId, row.link_id),
        enabled: open,
    });

    const isValidQty = (v: string) => {
        const n = Number(v);
        return v.trim() !== '' && Number.isInteger(n) && n >= 0;
    };

    const handleAdd = () => {
        if (!isValidQty(qty)) return;
        createTargetMutation.mutate({
            department_id: departmentId,
            department_type_job_link_id: row.link_id,
            qty: Number(qty),
            effective_date: effectiveDate,
        });
        setQty('');
    };

    const handleSaveEdit = (targetId: number) => {
        if (!isValidQty(editQty)) return;
        updateTargetMutation.mutate(
            { targetId, data: { qty: Number(editQty) } },
            { onSuccess: () => setEditingId(null) },
        );
    };

    const thisYear = dayjs().year();

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth={false}
            PaperProps={{ sx: { width: '100%', maxWidth: 780 } }}
        >
            <DialogTitle>
                {getString('planHistoryTitle', { jobName: row.job_name })}
            </DialogTitle>
            <DialogContent>
                {/* ── Add entry ──────────────────────────────────────────── */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5, mb: 2 }}>
                    <TextField
                        label={cfl(getString('qty'))}
                        size="small"
                        type="number"
                        value={qty}
                        onChange={(e) => setQty(e.target.value)}
                        error={qty.trim() !== '' && !isValidQty(qty)}
                        sx={{ width: 110 }}
                        inputProps={{ min: 0, step: 1 }}
                    />
                    <Button
                        variant="outlined"
                        size="small"
                        startIcon={<EventIcon />}
                        onClick={() => setDateDialogOpen(true)}
                    >
                        {formatDate(effectiveDate)}
                    </Button>
                    <Button
                        variant="contained"
                        size="small"
                        startIcon={<AddIcon />}
                        disabled={!isValidQty(qty) || createTargetMutation.isPending}
                        onClick={handleAdd}
                        sx={{ ml: 'auto' }}
                    >
                        {getString('addPlanEntry')}
                    </Button>
                </Box>

                <Divider sx={{ mb: 1 }} />

                {/* ── History table ──────────────────────────────────────── */}
                {isLoading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                        <CircularProgress size={24} />
                    </Box>
                ) : targets.length === 0 ? (
                    <Typography variant="body2" color="text.secondary" sx={{ p: 1.5 }}>
                        {getString('noPlanYet')}
                    </Typography>
                ) : (
                    <Box sx={{ maxHeight: 320, overflow: 'auto' }}>
                        <Table size="small" stickyHeader>
                            <TableHead>
                                <TableRow>
                                    <TableCell sx={headCell}>{cfl(getString('qty'))}</TableCell>
                                    <TableCell sx={headCell}>{cfl(getString('effectiveDate'))}</TableCell>
                                    <TableCell sx={headCell}>{cfl(getString('createdBy'))}</TableCell>
                                    <TableCell sx={headCell}>{cfl(getString('createdAt'))}</TableCell>
                                    <TableCell sx={{ ...headCell, ...actionsCell }} align="right">
                                        {cfl(getString('actions'))}
                                    </TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {targets.map((t: DepartmentJobTarget) => (
                                    <TableRow key={t.id} hover>
                                        <TableCell sx={denseCell}>
                                            {editingId === t.id ? (
                                                <TextField
                                                    size="small"
                                                    type="number"
                                                    autoFocus
                                                    value={editQty}
                                                    onChange={(e) => setEditQty(e.target.value)}
                                                    error={editQty.trim() !== '' && !isValidQty(editQty)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') handleSaveEdit(t.id);
                                                        if (e.key === 'Escape') setEditingId(null);
                                                    }}
                                                    sx={{ width: 84 }}
                                                    inputProps={{ min: 0, step: 1 }}
                                                />
                                            ) : (
                                                <Typography variant="body2" fontWeight={700}>
                                                    {t.qty}
                                                </Typography>
                                            )}
                                        </TableCell>
                                        <TableCell sx={denseCell}>
                                            <Typography variant="body2">
                                                {formatDate(t.effective_date)}
                                            </Typography>
                                        </TableCell>
                                        <TableCell sx={denseCell}>
                                            <Typography variant="body2" noWrap>
                                                {t.created_by_name ?? '—'}
                                            </Typography>
                                        </TableCell>
                                        <TableCell sx={denseCell}>
                                            <Typography variant="body2" color="text.secondary" noWrap>
                                                {dayjs(t.created_at).format('DD.MM.YYYY HH:mm')}
                                            </Typography>
                                        </TableCell>
                                        <TableCell sx={actionsCell} align="right">
                                            <Box sx={{ display: 'inline-flex', flexWrap: 'nowrap' }}>
                                            {editingId === t.id ? (
                                                <>
                                                    <IconButton
                                                        size="small"
                                                        color="primary"
                                                        disabled={
                                                            !isValidQty(editQty) ||
                                                            updateTargetMutation.isPending
                                                        }
                                                        onClick={() => handleSaveEdit(t.id)}
                                                    >
                                                        <CheckIcon fontSize="inherit" />
                                                    </IconButton>
                                                    <IconButton
                                                        size="small"
                                                        onClick={() => setEditingId(null)}
                                                    >
                                                        <CloseIcon fontSize="inherit" />
                                                    </IconButton>
                                                </>
                                            ) : (
                                                <>
                                                    <Tooltip title={getString('edit')}>
                                                        <IconButton
                                                            size="small"
                                                            onClick={() => {
                                                                setEditingId(t.id);
                                                                setEditQty(String(t.qty));
                                                            }}
                                                        >
                                                            <EditIcon fontSize="inherit" />
                                                        </IconButton>
                                                    </Tooltip>
                                                    <Tooltip title={getString('deletePlanEntry')}>
                                                        <span>
                                                            <IconButton
                                                                size="small"
                                                                color="error"
                                                                disabled={deleteTargetMutation.isPending}
                                                                onClick={() =>
                                                                    deleteTargetMutation.mutate(t.id)
                                                                }
                                                            >
                                                                <DeleteOutlineIcon fontSize="inherit" />
                                                            </IconButton>
                                                        </span>
                                                    </Tooltip>
                                                </>
                                            )}
                                            </Box>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </Box>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>{getString('close')}</Button>
            </DialogActions>

            <DateWheelDialog
                open={dateDialogOpen}
                onClose={() => setDateDialogOpen(false)}
                value={effectiveDate}
                titleKey="effectiveDate"
                getString={getString}
                onSave={(iso) => setEffectiveDate(iso)}
                minYear={thisYear - 5}
                maxYear={thisYear + 10}
            />
        </Dialog>
    );
}

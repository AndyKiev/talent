// src/components/admin/reviewers/oversight_assignment/OversightAssignmentPanel.tsx
//
// Batch auto-assignment of the oversight manager (people-review reviewer).
// Pick a main-department instance, optionally allow overwriting existing
// links, run — the backend walks each employee's department type -> oversight
// job -> holder (climbing up to the configured number of levels) and returns
// a per-employee report rendered below.
import { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Alert,
    Box,
    Button,
    Chip,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControlLabel,
    Paper,
    Snackbar,
    Stack,
    Switch,
    Tooltip,
    Typography,
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import { DataGrid, type GridColDef, type GridRenderCellParams } from '@mui/x-data-grid';
import { SelectScopeDepartment } from '../../../employees/SelectScopeDepartment';
import { DepartmentTreePicker } from '../../../employees/DepartmentTreePicker';
import type { DepartmentNode } from '../../departments/departmentApi';
import {
    runOversightAssignment,
    type OversightAssignmentReport,
    type OversightAssignmentResultRow,
    type OversightAssignmentStatus,
} from './oversightAssignmentApi';
import { PROCESS_ROLE_HOLDER_EMPLOYEE_QK } from '../../../../utils/queryKeys';
import { centeredGridCellsSx } from '../../../../utils/dataGridSx';
import { useDataGridLocale } from '../../../../hooks/useDataGridLocale';
import useString from '../../../../hooks/useString';
import type { GetStringFn } from '../../../../types/getStringFn';
import cfl from '../../../../utils/capitalizeFirstLetter';

const STATUS_COLOR: Record<OversightAssignmentStatus, 'success' | 'warning' | 'default' | 'error'> = {
    assigned: 'success',
    overwritten: 'warning',
    already_assigned: 'default',
    failed: 'error',
};

const STATUS_LABEL_KEY: Record<OversightAssignmentStatus, string> = {
    assigned: 'statusAssigned',
    overwritten: 'statusOverwritten',
    already_assigned: 'statusAlreadyAssigned',
    failed: 'statusFailed',
};

function reportColumns(getString: GetStringFn): GridColDef[] {
    return [
        {
            field: 'employee_code',
            headerName: cfl(getString('code')) || 'Code',
            width: 110,
        },
        {
            field: 'employee_name',
            headerName: cfl(getString('employee')) || 'Employee',
            flex: 1,
            minWidth: 180,
        },
        {
            field: 'department_name',
            headerName: cfl(getString('department')) || 'Department',
            width: 200,
        },
        {
            field: 'status',
            headerName: cfl(getString('status')) || 'Status',
            width: 150,
            renderCell: (params: GridRenderCellParams<OversightAssignmentResultRow>) => {
                const status = params.row.status;
                return (
                    <Chip
                        size="small"
                        color={STATUS_COLOR[status]}
                        variant={status === 'already_assigned' ? 'outlined' : 'filled'}
                        label={getString(STATUS_LABEL_KEY[status]) || status}
                    />
                );
            },
        },
        {
            field: 'reason_key',
            headerName: cfl(getString('reason')) || 'Reason',
            flex: 1,
            minWidth: 200,
            renderCell: (params: GridRenderCellParams<OversightAssignmentResultRow>) => {
                const row = params.row;
                if (!row.reason_key) return '';
                const reason = getString(row.reason_key) || row.reason_key;
                return row.candidates.length > 0
                    ? `${reason}: ${row.candidates.join(', ')}`
                    : reason;
            },
        },
        {
            field: 'previous_manager_name',
            headerName: cfl(getString('previousManager')) || 'Previous manager',
            width: 180,
        },
        {
            field: 'new_manager_name',
            headerName: cfl(getString('newManager')) || 'New manager',
            width: 180,
        },
        {
            field: 'levels_up',
            headerName: cfl(getString('levelsUp')) || 'Levels up',
            width: 110,
        },
    ];
}

export function OversightAssignmentPanel() {
    const getString = useString();
    const localeText = useDataGridLocale();
    const qc = useQueryClient();

    const [topId, setTopId] = useState<number | null>(null);
    const [department, setDepartment] = useState<{ id: number; name: string } | null>(null);
    const [overwrite, setOverwrite] = useState(false);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [report, setReport] = useState<OversightAssignmentReport | null>(null);
    const [snackbar, setSnackbar] = useState({
        open: false,
        message: '',
        severity: 'success' as 'success' | 'error',
    });

    const runMutation = useMutation({
        mutationFn: () =>
            runOversightAssignment({
                department_id: department!.id,
                overwrite,
            }),
        onSuccess: async (res) => {
            setReport(res);
            // the reviewer-assignment tabs read these links — refresh them
            await qc.invalidateQueries({ queryKey: PROCESS_ROLE_HOLDER_EMPLOYEE_QK });
            setSnackbar({ open: true, message: res.detail, severity: 'success' });
        },
        onError: (err: Error) =>
            setSnackbar({ open: true, message: err.message, severity: 'error' }),
    });

    const handleRunClick = () => {
        if (!department) return;
        if (overwrite) {
            setConfirmOpen(true);
            return;
        }
        runMutation.mutate();
    };

    const columns = useMemo(() => reportColumns(getString), [getString]);

    return (
        <Box>
            <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
                {getString('oversightAutoAssignment') || 'Oversight auto-assignment'}
            </Typography>

            <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} alignItems="flex-start">
                {/* ── department selection ── */}
                <Box sx={{ width: { xs: '100%', md: 420 }, flexShrink: 0 }}>
                    <Stack spacing={1}>
                        <SelectScopeDepartment
                            value={topId}
                            allowAll={false}
                            alwaysShow
                            onChange={(id: number | null) => {
                                setTopId(id);
                                setDepartment(null);
                            }}
                        />
                        {topId != null ? (
                            <DepartmentTreePicker
                                rootId={topId}
                                selectedId={department?.id ?? null}
                                onSelect={(node: DepartmentNode) =>
                                    setDepartment({ id: node.id, name: node.name })
                                }
                                maxHeight={320}
                            />
                        ) : (
                            <Typography variant="body2" color="text.secondary">
                                {getString('selectDepartmentFirst')}
                            </Typography>
                        )}
                        <Tooltip title={getString('overwriteExistingHint') || ''}>
                            <FormControlLabel
                                control={
                                    <Switch
                                        size="small"
                                        checked={overwrite}
                                        onChange={(_, v) => setOverwrite(v)}
                                    />
                                }
                                label={getString('overwriteExisting') || 'Overwrite existing'}
                                sx={{ '& .MuiFormControlLabel-label': { fontSize: 13, fontWeight: 600 } }}
                            />
                        </Tooltip>
                        <Button
                            variant="contained"
                            startIcon={
                                runMutation.isPending
                                    ? <CircularProgress size={16} color="inherit" />
                                    : <PlayArrowIcon />
                            }
                            disabled={!department || runMutation.isPending}
                            onClick={handleRunClick}
                        >
                            {cfl(getString('runAssignment')) || 'Run assignment'}
                            {department ? ` — ${department.name}` : ''}
                        </Button>
                    </Stack>
                </Box>

                {/* ── report ── */}
                <Box sx={{ flex: 1, width: '100%', minWidth: 0 }}>
                    {!report && !runMutation.isPending && (
                        <Alert severity="info">
                            {getString('oversightAssignmentIntro') ||
                                'Pick a department and run the assignment to see the report.'}
                        </Alert>
                    )}
                    {report && (
                        <Stack spacing={2}>
                            <Alert severity={report.failed > 0 ? 'warning' : 'success'}>
                                {report.detail}
                            </Alert>
                            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap alignItems="center">
                                <Chip
                                    size="small"
                                    variant="outlined"
                                    label={`${getString('peopleReviewSession') || 'Session'}: ${report.session_name ?? report.session_id}`}
                                />
                                <Chip
                                    size="small"
                                    variant="outlined"
                                    color={report.session_department_linked ? 'primary' : 'default'}
                                    label={
                                        report.session_department_linked
                                            ? (getString('sessionDepartmentLinked') || 'Linked to department')
                                            : (getString('sessionNotDepartmentLinked') || 'No department link')
                                    }
                                />
                                <Chip
                                    size="small"
                                    variant="outlined"
                                    label={`${getString('levelsUp') || 'Levels up'}: ${report.max_levels_up}`}
                                />
                                <Chip size="small" label={`${getString('total') || 'Total'}: ${report.total}`} />
                                <Chip size="small" color="success" label={`${getString('statusAssigned') || 'Assigned'}: ${report.assigned}`} />
                                {report.overwritten > 0 && (
                                    <Chip size="small" color="warning" label={`${getString('statusOverwritten') || 'Overwritten'}: ${report.overwritten}`} />
                                )}
                                <Chip size="small" variant="outlined" label={`${getString('statusAlreadyAssigned') || 'Already assigned'}: ${report.already_assigned}`} />
                                <Chip size="small" color="error" label={`${getString('statusFailed') || 'Failed'}: ${report.failed}`} />
                            </Stack>
                            <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
                                <DataGrid
                                    rows={report.rows}
                                    columns={columns}
                                    getRowId={(r: OversightAssignmentResultRow) => r.employee_id}
                                    disableRowSelectionOnClick
                                    hideFooterSelectedRowCount
                                    localeText={localeText}
                                    initialState={{
                                        pagination: { paginationModel: { page: 0, pageSize: 25 } },
                                    }}
                                    pageSizeOptions={[10, 25, 50, 100]}
                                    getRowHeight={() => 'auto'}
                                    sx={{
                                        ...centeredGridCellsSx,
                                        '& .MuiDataGrid-cell': { py: 0.75 },
                                    }}
                                />
                            </Paper>
                        </Stack>
                    )}
                </Box>
            </Stack>

            {/* overwrite confirmation */}
            <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)} maxWidth="xs" fullWidth>
                <DialogTitle>{getString('overwriteExisting') || 'Overwrite existing'}</DialogTitle>
                <DialogContent>
                    <Typography variant="body2">
                        {getString('confirmOverwriteRunText') ||
                            'Existing oversight-manager links of the selected department will be replaced by the computed ones. Continue?'}
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button variant="outlined" onClick={() => setConfirmOpen(false)}>
                        {getString('cancel') || 'Cancel'}
                    </Button>
                    <Button
                        variant="contained"
                        color="warning"
                        onClick={() => {
                            setConfirmOpen(false);
                            runMutation.mutate();
                        }}
                    >
                        {getString('confirm') || 'Confirm'}
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

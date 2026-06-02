// src/components/planning/PlanScopeGrid.tsx
import { useCallback, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
    Alert,
    Autocomplete,
    Box,
    Chip,
    CircularProgress,
    Paper,
    Snackbar,
    TextField,
    Typography,
} from '@mui/material';
import LockIcon from '@mui/icons-material/Lock';
import { DataGrid } from '@mui/x-data-grid';

import {
    fetchPlanScopesBySession,
    type PlanScope,
    type PlanSession,
} from './planningApi';
import { usePlanScopeMutations } from './usePlanScopeMutations';
import { usePlanScopeColumns, type ScopeEditingState } from './usePlanScopeColumns';
import { useDataGridLocale } from '../../hooks/useDataGridLocale';
import { PLAN_SCOPE_QK } from '../../utils/queryKeys.ts';
import useString from '../../hooks/useString';
import str from '../../strings/str';
import cfl from '../../utils/helpers.ts';

interface Props {
    session: PlanSession;
}

interface DeptOption {
    id: number;
    label: string;
}

export function PlanScopeGrid({ session }: Props) {
    const getString = useString({ str });
    const editable = session.status?.key === 'open';

    const [snackbar, setSnackbar] = useState({
        open: false,
        message: '',
        severity: 'success' as 'success' | 'error',
    });
    const [editingState, setEditingState] = useState<ScopeEditingState>({ rowId: null });
    const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 25 });
    const [deptFilter, setDeptFilter] = useState<DeptOption | null>(null);

    const { data: rows = [], isLoading, error } = useQuery({
        queryKey: [...PLAN_SCOPE_QK, session.id],
        queryFn: () => fetchPlanScopesBySession(session.id),
        staleTime: 60 * 1000,
    });

    const { updateMutation } = usePlanScopeMutations({
        planSessionId: session.id,
        setSnackbar,
        onUpdateSuccess: () => setEditingState({ rowId: null }),
    });

    const localeText = useDataGridLocale();

    // Distinct departments present in this session's scopes (for the filter).
    const departmentOptions = useMemo<DeptOption[]>(() => {
        const map = new Map<number, string>();
        for (const r of rows) {
            if (!map.has(r.department_id)) {
                map.set(r.department_id, r.department?.name ?? `#${r.department_id}`);
            }
        }
        return Array.from(map, ([id, label]) => ({ id, label })).sort((a, b) =>
            a.label.localeCompare(b.label),
        );
    }, [rows]);

    const filteredRows = useMemo(
        () => (deptFilter ? rows.filter((r) => r.department_id === deptFilter.id) : rows),
        [rows, deptFilter],
    );

    const handleActivate = useCallback((rowId: number) => {
        setEditingState({ rowId });
    }, []);

    const handleCancel = useCallback(() => {
        setEditingState({ rowId: null });
    }, []);

    const handleCommit = useCallback(
        (row: PlanScope, newValue: string) => {
            const trimmed = newValue.trim();
            const current = row.value == null ? '' : String(row.value);
            // No-op if unchanged — just close the editor.
            if (trimmed === current) {
                setEditingState({ rowId: null });
                return;
            }
            if (trimmed === '') {
                updateMutation.mutate({ id: row.id, data: { value: null } });
                return;
            }
            const parsed = Number(trimmed);
            if (!Number.isInteger(parsed) || parsed < 0 || parsed > 100) {
                setSnackbar({
                    open: true,
                    message: getString('planValueOutOfRange') || 'Value must be an integer between 0 and 100',
                    severity: 'error',
                });
                setEditingState({ rowId: null });
                return;
            }
            updateMutation.mutate({ id: row.id, data: { value: parsed } });
        },
        [updateMutation, getString],
    );

    const columns = usePlanScopeColumns({
        getString,
        editable,
        editingState,
        onActivate: handleActivate,
        onCommit: handleCommit,
        onCancel: handleCancel,
        updateIsPending: updateMutation.isPending,
    });

    return (
        <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2, flexWrap: 'wrap' }}>
                <Typography variant="h6" fontWeight={600} sx={{ flex: 1 }}>
                    {cfl(getString('planValues')) || 'Plan Values'} — {session.name}
                </Typography>
                {!editable && (
                    <Chip
                        icon={<LockIcon fontSize="small" />}
                        label={
                            session.status?.key === 'pending'
                                ? getString('sessionPendingLocked') || 'Pending — open to edit'
                                : getString('sessionClosedLocked') || 'Closed — revert to edit'
                        }
                        size="small"
                        color="default"
                        variant="outlined"
                    />
                )}
            </Box>

            {/* Department filter: searchable single-select */}
            <Box sx={{ mb: 2, maxWidth: 360 }}>
                <Autocomplete<DeptOption>
                    options={departmentOptions}
                    value={deptFilter}
                    onChange={(_, val) => setDeptFilter(val)}
                    getOptionLabel={(o) => o.label}
                    isOptionEqualToValue={(a, b) => a.id === b.id}
                    size="small"
                    disabled={isLoading || departmentOptions.length === 0}
                    renderInput={(params) => (
                        <TextField
                            {...params}
                            label={cfl(getString('filterByDepartment')) || 'Filter by department'}
                            placeholder={getString('allDepartments') || 'All departments'}
                        />
                    )}
                />
            </Box>

            {isLoading && (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                    <CircularProgress />
                </Box>
            )}

            {!isLoading && error && (
                <Alert severity="error" sx={{ m: 2 }}>
                    {(error as Error).message}
                </Alert>
            )}

            {!isLoading && !error && (
                <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
                    {rows.length === 0 ? (
                        <Box sx={{ p: 4, textAlign: 'center' }}>
                            <Typography variant="body2" color="text.secondary">
                                {getString('noPlanScopesYet') ||
                                    'No plan rows. Configure category and scope defaults, then create a session.'}
                            </Typography>
                        </Box>
                    ) : (
                        <DataGrid
                            rows={filteredRows}
                            columns={columns}
                            paginationModel={paginationModel}
                            onPaginationModelChange={setPaginationModel}
                            pageSizeOptions={[10, 25, 50, 100]}
                            disableRowSelectionOnClick
                            getRowId={(row) => row.id}
                            getRowHeight={() => 'auto'}
                            localeText={localeText}
                            hideFooterSelectedRowCount
                            sx={{ '& .MuiDataGrid-cell': { alignItems: 'center', py: 1 } }}
                        />
                    )}
                </Paper>
            )}

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

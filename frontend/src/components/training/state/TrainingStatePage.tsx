// src/components/training/state/TrainingStatePage.tsx
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
    Alert,
    Autocomplete,
    Box,
    Button,
    Chip,
    CircularProgress,
    FormControl,
    InputLabel,
    MenuItem,
    Paper,
    Select,
    TextField,
    Typography,
} from '@mui/material';
import BarChartIcon from '@mui/icons-material/BarChart';
import { DataGrid } from '@mui/x-data-grid';

import { fetchTrainingTypes } from '../training_types/trainingTypeApi.ts';
import { fetchTrainingState } from './trainingStateApi.ts';
import { fetchEmployeeTrainingStatuses } from '../employee_training_statuses/employeeTrainingStatusApi.ts';
import { useTrainingStateColumns } from './useTrainingStateColumns.tsx';
import { TrainingStateStatsDialog } from './TrainingStateStatsDialog.tsx';
import { buildStatusOrder, trainingStatusLabel, statusColor } from './trainingStatusMeta.ts';
import { useDataGridLocale } from '../../../hooks/useDataGridLocale.ts';
import useString from '../../../hooks/useString.ts';
import cfl from '../../../utils/helpers.ts';
import { TRAINING_TYPE_QK, TRAINING_STATE_QK, EMPLOYEE_TRAINING_STATUS_QK } from '../../../utils/queryKeys.ts';

const ALL = 'all';

export function TrainingStatePage() {
    const getString = useString();
    const localeText = useDataGridLocale();

    const [typeId, setTypeId] = useState<number | null>(null);
    const [statusFilter, setStatusFilter] = useState<string>(ALL);
    const [deptFilter, setDeptFilter] = useState<string>(ALL); // main department id, or ALL
    const [statsOpen, setStatsOpen] = useState(false);
    const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 25 });

    const { data: trainingTypes = [] } = useQuery({
        queryKey: TRAINING_TYPE_QK,
        queryFn: fetchTrainingTypes,
        staleTime: 5 * 60 * 1000,
    });

    const { data: statuses = [] } = useQuery({
        queryKey: EMPLOYEE_TRAINING_STATUS_QK,
        queryFn: fetchEmployeeTrainingStatuses,
        staleTime: 5 * 60 * 1000,
    });

    // Status order comes from the DB (not_planned first, then by sort_order).
    const orderedStatusKeys = useMemo(() => buildStatusOrder(statuses), [statuses]);

    const { data: rows = [], isLoading, error } = useQuery({
        queryKey: TRAINING_STATE_QK(typeId),
        queryFn: () => fetchTrainingState(typeId as number),
        enabled: typeId != null,
        staleTime: 60 * 1000,
    });

    const selectedType = trainingTypes.find((t) => t.id === typeId) ?? null;

    // Distinct main departments present in the current payload → filter options,
    // ordered by department-category sort_order (store before directorate, …),
    // then by name within a category.
    const deptOptions = useMemo(() => {
        const map = new Map<number, { name: string; catSort: number }>();
        for (const r of rows) {
            if (r.main_department_id != null) {
                map.set(r.main_department_id, {
                    name: r.main_department_name || String(r.main_department_id),
                    catSort: r.main_department_category_sort_order,
                });
            }
        }
        return [...map.entries()]
            .map(([id, v]) => ({ id, name: v.name, catSort: v.catSort }))
            .sort((a, b) => (a.catSort - b.catSort) || a.name.localeCompare(b.name));
    }, [rows]);

    // Rows narrowed by department only — drives the always-visible 4-status tally.
    const deptFilteredRows = useMemo(
        () => (deptFilter === ALL ? rows : rows.filter((r) => String(r.main_department_id) === deptFilter)),
        [rows, deptFilter],
    );

    const gridRows = useMemo(
        () => (statusFilter === ALL ? deptFilteredRows : deptFilteredRows.filter((r) => r.status_key === statusFilter)),
        [deptFilteredRows, statusFilter],
    );

    const tally = useMemo(() => {
        const counts: Record<string, number> = Object.fromEntries(orderedStatusKeys.map((k) => [k, 0]));
        for (const r of deptFilteredRows) counts[r.status_key] = (counts[r.status_key] ?? 0) + 1;
        return counts;
    }, [deptFilteredRows, orderedStatusKeys]);

    const columns = useTrainingStateColumns({ getString });

    return (
        <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2, flexWrap: 'wrap' }}>
                <Typography variant="h6" fontWeight={600} sx={{ flex: 1, minWidth: 160 }}>
                    {cfl(getString('trainingState')) || 'State'}
                </Typography>
                <Button
                    variant="outlined"
                    startIcon={<BarChartIcon />}
                    onClick={() => setStatsOpen(true)}
                >
                    {cfl(getString('trainingStatistics')) || 'Statistics'}
                </Button>
            </Box>

            {/* Filters */}
            <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
                <Autocomplete
                    sx={{ minWidth: 280, flex: 1 }}
                    size="small"
                    options={trainingTypes}
                    getOptionLabel={(o) => o.name}
                    value={selectedType}
                    onChange={(_e, v) => {
                        setTypeId(v?.id ?? null);
                        setDeptFilter(ALL);
                    }}
                    isOptionEqualToValue={(o, v) => o.id === v.id}
                    noOptionsText={getString('noOptions') || 'No options'}
                    renderInput={(params) => (
                        <TextField {...params} variant="outlined" label={cfl(getString('trainingType')) || 'Training type'} />
                    )}
                />

                <FormControl sx={{ minWidth: 200 }} size="small">
                    <InputLabel>{cfl(getString('status')) || 'Status'}</InputLabel>
                    <Select
                        variant="outlined"
                        label={cfl(getString('status')) || 'Status'}
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                    >
                        <MenuItem value={ALL}>{getString('all') || 'All'}</MenuItem>
                        {orderedStatusKeys.map((k) => (
                            <MenuItem key={k} value={k}>
                                {trainingStatusLabel(getString, k)}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>

                <FormControl sx={{ minWidth: 220 }} size="small" disabled={deptOptions.length === 0}>
                    <InputLabel>{cfl(getString('mainDepartment')) || 'Main department'}</InputLabel>
                    <Select
                        variant="outlined"
                        label={cfl(getString('mainDepartment')) || 'Main department'}
                        value={deptFilter}
                        onChange={(e) => setDeptFilter(e.target.value)}
                    >
                        <MenuItem value={ALL}>{getString('all') || 'All'}</MenuItem>
                        {deptOptions.map((d) => (
                            <MenuItem key={d.id} value={String(d.id)}>
                                {d.name}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>
            </Box>

            {/* Tally */}
            {typeId != null && (
                <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                    {orderedStatusKeys.map((k) => (
                        <Chip
                            key={k}
                            label={`${trainingStatusLabel(getString, k)}: ${tally[k] ?? 0}`}
                            sx={{ bgcolor: statusColor(k), color: '#fff', fontWeight: 500 }}
                        />
                    ))}
                    <Chip variant="outlined" label={`${cfl(getString('total')) || 'Total'}: ${deptFilteredRows.length}`} />
                </Box>
            )}

            {typeId == null && (
                <Alert severity="info">
                    {getString('selectTrainingTypePrompt') || 'Select a training type to view its state.'}
                </Alert>
            )}

            {isLoading && (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                    <CircularProgress />
                </Box>
            )}

            {error && (
                <Alert severity="error" sx={{ m: 2 }}>
                    {(error as Error).message}
                </Alert>
            )}

            {typeId != null && !isLoading && !error && (
                <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
                    <DataGrid
                        rows={gridRows}
                        columns={columns}
                        paginationModel={paginationModel}
                        onPaginationModelChange={setPaginationModel}
                        pageSizeOptions={[10, 25, 50, 100]}
                        disableRowSelectionOnClick
                        getRowId={(row) => row.employee_id}
                        localeText={localeText}
                        hideFooterSelectedRowCount
                        sx={{ '& .MuiDataGrid-cell': { alignItems: 'center' } }}
                    />
                </Paper>
            )}

            <TrainingStateStatsDialog
                open={statsOpen}
                onClose={() => setStatsOpen(false)}
                trainingTypes={trainingTypes}
                initialTrainingTypeId={typeId}
            />
        </Box>
    );
}

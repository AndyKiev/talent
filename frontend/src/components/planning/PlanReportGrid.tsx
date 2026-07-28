// src/components/planning/PlanReportGrid.tsx
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
    Alert,
    Autocomplete,
    Box,
    Button,
    CircularProgress,
    Paper,
    TextField,
    Typography,
} from '@mui/material';
import AssessmentIcon from '@mui/icons-material/Assessment';
import GridOnIcon from '@mui/icons-material/GridOn';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { DataGrid } from '@mui/x-data-grid';

import {
    fetchPlanReportBySession,
    type PlanReportRow,
    type PlanSession,
} from './planningApi';
import { fetchPlanMatrixBySession } from './planMatrixApi';
import PlanMatrixGrid from './PlanMatrixGrid';
import { usePlanReportColumns } from './usePlanReportColumns';
import { useDataGridLocale } from '../../hooks/useDataGridLocale';
import useString from '../../hooks/useString';
import str from '../../strings/str';
import cfl from '../../utils/helpers.ts';
import { AsyncContent } from '../ui/AsyncContent';

// Local query keys — keep report/matrix caches separate from the scope grid.
const PLAN_REPORT_QK = ['plan_report'] as const;
const PLAN_MATRIX_QK = ['plan_matrix'] as const;

// Sentinel id for the combined (talent_status = NULL) rows in the status filter.
const COMBINED_TS_ID = -1;

interface Props {
    session: PlanSession;
}

interface DeptOption {
    id: number;
    label: string;
}

export function PlanReportGrid({ session }: Props) {
    const getString = useString({ str });

    const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 25 });
    const [deptFilter, setDeptFilter] = useState<DeptOption | null>(null);
    const [jobGroupFilter, setJobGroupFilter] = useState<DeptOption | null>(null);
    const [talentStatusFilter, setTalentStatusFilter] = useState<DeptOption | null>(null);
    const [regionFilter, setRegionFilter] = useState<DeptOption | null>(null);
    const [showMatrix, setShowMatrix] = useState(false);

    const {
        data: matrix,
        isLoading: matrixLoading,
        error: matrixError,
    } = useQuery({
        queryKey: [...PLAN_MATRIX_QK, session.id],
        queryFn: () => fetchPlanMatrixBySession(session.id),
        enabled: showMatrix,
        staleTime: 60 * 1000,
    });

    const { data, isLoading, error } = useQuery({
        queryKey: [...PLAN_REPORT_QK, session.id],
        queryFn: () => fetchPlanReportBySession(session.id),
        staleTime: 60 * 1000,
    });

    const rows: PlanReportRow[] = data?.rows ?? [];
    const localeText = useDataGridLocale();

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

    const jobGroupOptions = useMemo<DeptOption[]>(() => {
        const map = new Map<number, string>();
        for (const r of rows) {
            if (!map.has(r.job_group_id)) {
                map.set(r.job_group_id, r.job_group?.name ?? `#${r.job_group_id}`);
            }
        }
        return Array.from(map, ([id, label]) => ({ id, label })).sort((a, b) =>
            a.label.localeCompare(b.label),
        );
    }, [rows]);

    // Talent statuses present, including the combined (NULL) row → sentinel -1.
    const talentStatusOptions = useMemo<DeptOption[]>(() => {
        const map = new Map<number, string>();
        for (const r of rows) {
            if (r.talent_status_id == null) {
                if (!map.has(COMBINED_TS_ID)) {
                    map.set(COMBINED_TS_ID, getString('allTalentStatuses') || 'All (combined)');
                }
            } else if (!map.has(r.talent_status_id)) {
                map.set(r.talent_status_id, r.talent_status?.key ?? `#${r.talent_status_id}`);
            }
        }
        return Array.from(map, ([id, label]) => ({ id, label })).sort((a, b) =>
            a.label.localeCompare(b.label),
        );
    }, [rows, getString]);

    const filteredRows = useMemo(() => {
        let r = rows;
        if (jobGroupFilter) r = r.filter((x) => x.job_group_id === jobGroupFilter.id);
        if (deptFilter) r = r.filter((x) => x.department_id === deptFilter.id);
        if (talentStatusFilter) {
            r = r.filter((x) =>
                talentStatusFilter.id === COMBINED_TS_ID
                    ? x.talent_status_id == null
                    : x.talent_status_id === talentStatusFilter.id,
            );
        }
        if (regionFilter) r = r.filter((x) => (x.region?.id ?? -1) === regionFilter.id);
        return r;
    }, [rows, jobGroupFilter, deptFilter, talentStatusFilter, regionFilter]);

    const regionOptions = useMemo<DeptOption[]>(() => {
        const map = new Map<number, string>();
        for (const r of rows) {
            if (r.region && !map.has(r.region.id)) {
                map.set(r.region.id, r.region.name);
            }
        }
        return Array.from(map, ([id, label]) => ({ id, label })).sort((a, b) =>
            a.label.localeCompare(b.label),
        );
    }, [rows]);

    const columns = usePlanReportColumns({ getString });

    // Pivot matrix view (store departments) — temporary back button until the
    // breadcrumb is wired to this sub-view.
    if (showMatrix) {
        return (
            <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
                <Box sx={{ mb: 1 }}>
                    <Button
                        variant="text"
                        size="small"
                        startIcon={<ArrowBackIcon />}
                        onClick={() => setShowMatrix(false)}
                    >
                        {getString('backToReportGrid') || 'Back to grid'}
                    </Button>
                </Box>
                {matrixLoading && (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                        <CircularProgress />
                    </Box>
                )}
                {!matrixLoading && matrixError && (
                    <Alert severity="error" sx={{ m: 2 }}>
                        {(matrixError as Error).message}
                    </Alert>
                )}
                {!matrixLoading && !matrixError && matrix && (
                    matrix.data.length === 0 ? (
                        <Box sx={{ p: 4, textAlign: 'center' }}>
                            <Typography variant="body2" color="text.secondary">
                                {getString('noStoreMatrixRows') ||
                                    'No store departments with plan values for this session.'}
                            </Typography>
                        </Box>
                    ) : (
                        <Box sx={{ width: '100%' }}>
                            <PlanMatrixGrid matrix={matrix} />
                        </Box>
                    )
                )}
            </Box>
        );
    }

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2, flexWrap: 'wrap' }}>
                <AssessmentIcon color="action" />
                <Typography variant="h6" fontWeight={600} sx={{ flex: 1 }}>
                    {cfl(getString('planVsFact')) || 'Plan vs Fact'} — {session.name}
                </Typography>
            </Box>

            <Box sx={{ mb: 2, display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                <Autocomplete<DeptOption>
                    options={departmentOptions}
                    value={deptFilter}
                    onChange={(_, val) => setDeptFilter(val)}
                    getOptionLabel={(o) => o.label}
                    isOptionEqualToValue={(a, b) => a.id === b.id}
                    size="small"
                    sx={{ minWidth: 320, flex: 1, maxWidth: 360 }}
                    disabled={isLoading || departmentOptions.length === 0}
                    renderInput={(params) => (
                        <TextField
                            {...params}
                            label={cfl(getString('filterByDepartment')) || 'Filter by department'}
                            placeholder={getString('allDepartments') || 'All departments'}
                        />
                    )}
                />
                <Autocomplete<DeptOption>
                    options={jobGroupOptions}
                    value={jobGroupFilter}
                    onChange={(_, val) => setJobGroupFilter(val)}
                    getOptionLabel={(o) => o.label}
                    isOptionEqualToValue={(a, b) => a.id === b.id}
                    size="small"
                    sx={{ minWidth: 240, flex: 1, maxWidth: 300 }}
                    disabled={isLoading || jobGroupOptions.length === 0}
                    renderInput={(params) => (
                        <TextField
                            {...params}
                            label={cfl(getString('filterByJobGroup')) || 'Filter by job group'}
                            placeholder={getString('allJobGroups') || 'All job groups'}
                        />
                    )}
                />
                <Autocomplete<DeptOption>
                    options={talentStatusOptions}
                    value={talentStatusFilter}
                    onChange={(_, val) => setTalentStatusFilter(val)}
                    getOptionLabel={(o) => o.label}
                    isOptionEqualToValue={(a, b) => a.id === b.id}
                    size="small"
                    sx={{ minWidth: 220, flex: 1, maxWidth: 280 }}
                    disabled={isLoading || talentStatusOptions.length === 0}
                    renderInput={(params) => (
                        <TextField
                            {...params}
                            label={cfl(getString('filterByTalentStatus')) || 'Filter by talent status'}
                            placeholder={getString('allTalentStatusesFilter') || 'All statuses'}
                        />
                    )}
                />

                <Autocomplete<DeptOption>
                    options={regionOptions}
                    value={regionFilter}
                    onChange={(_, val) => setRegionFilter(val)}
                    getOptionLabel={(o) => o.label}
                    isOptionEqualToValue={(a, b) => a.id === b.id}
                    size="small"
                    sx={{ minWidth: 200, flex: 1, maxWidth: 260 }}
                    disabled={isLoading || regionOptions.length === 0}
                    renderInput={(params) => (
                        <TextField
                            {...params}
                            label={cfl(getString('filterByRegion')) || 'Filter by region'}
                            placeholder={getString('allRegions') || 'All regions'}
                        />
                    )}
                />

                <Button
                    variant="outlined"
                    size="small"
                    startIcon={<GridOnIcon />}
                    onClick={() => setShowMatrix(true)}
                    sx={{ ml: 'auto' }}
                >
                    {getString('storePivotReport') || 'Store pivot'}
                </Button>
            </Box>

            <AsyncContent isLoading={isLoading} error={error}>
                <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', flex: 1, minHeight: 0 }}>
                    {rows.length === 0 ? (
                        <Box sx={{ p: 4, textAlign: 'center' }}>
                            <Typography variant="body2" color="text.secondary">
                                {getString('noPlanReportRows') ||
                                    'No plan rows with values yet. Set plan values to see plan vs fact.'}
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
                            getRowId={(row) => row.plan_scope_id}
                            getRowHeight={() => 'auto'}
                            localeText={localeText}
                            hideFooterSelectedRowCount
                            sx={{ height: '100%', '& .MuiDataGrid-cell': { alignItems: 'center', py: 1 } }}
                        />
                    )}
                </Paper>
            </AsyncContent>
        </Box>
    );
}
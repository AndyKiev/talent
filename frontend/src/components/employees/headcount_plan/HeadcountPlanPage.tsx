// src/components/employees/headcount_plan/HeadcountPlanPage.tsx
//
// Headcount plan-vs-fact per department instance: pick the exact department
// (scope-aware) + a calculation date (wheel picker), get a per-job grid of
// plan qty (effective-dated targets, editable via the history dialog) and
// fact qty (working employees as of the date, replayed from events).
// Gated by the headcount_plan_enabled developer setting.
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
    Alert,
    Box,
    Breadcrumbs,
    Button,
    CircularProgress,
    Paper,
    Snackbar,
    Typography,
} from '@mui/material';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import EventIcon from '@mui/icons-material/Event';
import GroupsIcon from '@mui/icons-material/Groups';
import { DataGrid } from '@mui/x-data-grid';
import { Link, Navigate, useNavigate, useSearch } from '@tanstack/react-router';
import dayjs from 'dayjs';

import AppShell from '../../layout/AppShell';
import { PageContainer } from '../../layout/PageContainer';
import { HeadcountDepartmentSelector } from './HeadcountDepartmentSelector';
import DateWheelDialog from './DateWheelDialog';
import { FactEmployeesPanel } from './FactEmployeesPanel';
import { PlanHistoryDialog } from './PlanHistoryDialog';
import { fetchHeadcountCalc, type HeadcountCalcRow } from './headcountPlanApi';
import type { HeadcountPlanSearch } from '../../../routes/employees/headcount_plan';
import { useHeadcountPlanColumns } from './useHeadcountPlanColumns';
import { useHeadcountPlanMutations } from './useHeadcountPlanMutations';
import { HEADCOUNT_CALC_QK } from '../../../utils/queryKeys';
import { useBooleanSetting } from '../../../hooks/useAppSetting';
import { useDataGridLocale } from '../../../hooks/useDataGridLocale';
import { centeredGridCellsSx } from '../../../utils/dataGridSx';
import { formatDate } from '../../../utils/date';
import useString from '../../../hooks/useString';
import cfl from '../../../utils/helpers.ts';

export function HeadcountPlanPage() {
    const getString = useString();

    // Page state lives in the URL (?top&dept&date&job) so leaving for the
    // employee card and pressing Back re-renders the same selection. Intra-page
    // changes use replace so history holds only the latest state of this page.
    const search = useSearch({ from: '/employees/headcount_plan' });
    const navigate = useNavigate();
    const setSearch = (patch: Partial<HeadcountPlanSearch>) =>
        navigate({
            to: '/employees/headcount_plan',
            search: { ...search, ...patch },
            replace: true,
        });

    const topId = search.top ?? null;
    const departmentId = search.dept ?? null;
    const onDate = search.date ?? dayjs().format('YYYY-MM-DD');

    const [dateDialogOpen, setDateDialogOpen] = useState(false);
    const [historyRow, setHistoryRow] = useState<HeadcountCalcRow | null>(null);
    const [snackbar, setSnackbar] = useState({
        open: false,
        message: '',
        severity: 'success' as 'success' | 'error',
    });

    const { createTargetMutation, updateTargetMutation, deleteTargetMutation } =
        useHeadcountPlanMutations({ setSnackbar });

    // Dept + date both live in the query key: changing either recalculates.
    const { data: rows = [], isLoading, isFetching, error } = useQuery({
        queryKey: departmentId != null ? HEADCOUNT_CALC_QK(departmentId, onDate) : ['headcount_calc', 'idle'],
        queryFn: () => fetchHeadcountCalc(departmentId as number, onDate),
        enabled: departmentId != null,
    });

    // The fact panel's row is resolved from the URL against the loaded rows.
    const factRow =
        search.job != null ? rows.find((r) => r.job_id === search.job) ?? null : null;

    const columns = useHeadcountPlanColumns({
        getString,
        onPlanClick: (row) => setHistoryRow(row),
        onFactClick: (row) => setSearch({ job: row.job_id }),
    });
    const localeText = useDataGridLocale();

    // Feature gate: OFF hides the menu item server-side, a direct URL just
    // redirects home (nothing while the settings are still loading).
    const { enabled: featureOn, isLoading: settingLoading } =
        useBooleanSetting('headcount_plan_enabled');
    if (settingLoading) return null;
    if (!featureOn) return <Navigate to="/" replace />;

    const busy = isLoading || isFetching;
    const thisYear = dayjs().year();

    return (
        <AppShell>
            <PageContainer>
                <Breadcrumbs separator={<NavigateNextIcon fontSize="small" />} sx={{ mb: 3 }}>
                    <Link to="/" style={{ textDecoration: 'none', color: 'inherit' }}>
                        <Typography variant="body2" color="text.secondary">
                            {cfl(getString('home'))}
                        </Typography>
                    </Link>
                    <Typography variant="body2" color="text.primary" fontWeight={600}>
                        {cfl(getString('headcountPlanTitle'))}
                    </Typography>
                </Breadcrumbs>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                    <GroupsIcon color="action" />
                    <Typography variant="h6" fontWeight={600} sx={{ flex: 1 }}>
                        {cfl(getString('headcountPlanTitle'))}
                    </Typography>
                    <Button
                        variant="outlined"
                        size="small"
                        startIcon={<EventIcon />}
                        onClick={() => setDateDialogOpen(true)}
                    >
                        {cfl(getString('viewDate'))}: {formatDate(onDate)}
                    </Button>
                </Box>

                <Box sx={{ display: 'flex', gap: 3, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                    {/* ── Department instance picker: fixed ≤40% on desktop ── */}
                    <Box
                        sx={{
                            flexBasis: { xs: '100%', md: '38%' },
                            maxWidth: { md: '40%' },
                            minWidth: 280,
                            flexGrow: 0,
                            flexShrink: 0,
                        }}
                    >
                        <HeadcountDepartmentSelector
                            topId={topId}
                            value={departmentId}
                            onTopChange={(id) =>
                                setSearch({
                                    top: id ?? undefined,
                                    // The top instance itself is a valid pick until refined.
                                    dept: id ?? undefined,
                                    job: undefined,
                                })
                            }
                            onChange={(id) =>
                                setSearch({ dept: id ?? undefined, job: undefined })
                            }
                            getString={getString}
                        />
                    </Box>

                    {/* ── Plan vs fact grid: ~60% ────────────────────────── */}
                    <Box sx={{ flexBasis: { xs: '100%', md: '58%' }, flexGrow: 1, minWidth: 360 }}>
                        {departmentId == null ? (
                            <Paper
                                elevation={0}
                                sx={{ border: '1px dashed', borderColor: 'divider', p: 4, textAlign: 'center' }}
                            >
                                <Typography variant="body2" color="text.secondary">
                                    {getString('selectDepartmentFirst')}
                                </Typography>
                            </Paper>
                        ) : busy ? (
                            <Box sx={{ display: 'flex', justifyContent: 'center', p: 6 }}>
                                <CircularProgress />
                            </Box>
                        ) : error ? (
                            <Alert severity="error">{(error as Error).message}</Alert>
                        ) : (
                            <Paper
                                elevation={0}
                                sx={{ border: '1px solid', borderColor: 'divider' }}
                            >
                                <DataGrid
                                    rows={rows}
                                    columns={columns}
                                    getRowId={(row: HeadcountCalcRow) => row.link_id}
                                    disableRowSelectionOnClick
                                    hideFooterSelectedRowCount
                                    localeText={localeText}
                                    autoHeight
                                    pageSizeOptions={[10, 25, 50]}
                                    initialState={{
                                        pagination: { paginationModel: { page: 0, pageSize: 25 } },
                                    }}
                                    sx={centeredGridCellsSx}
                                />
                            </Paper>
                        )}

                        {/* ── Employees behind a fact qty ────────────────── */}
                        {factRow != null && departmentId != null && !busy && (
                            <FactEmployeesPanel
                                departmentId={departmentId}
                                isoDate={onDate}
                                row={factRow}
                                getString={getString}
                                onClose={() => setSearch({ job: undefined })}
                            />
                        )}
                    </Box>
                </Box>

                {/* ── View-date wheel ────────────────────────────────────── */}
                <DateWheelDialog
                    open={dateDialogOpen}
                    onClose={() => setDateDialogOpen(false)}
                    value={onDate}
                    titleKey="viewDate"
                    getString={getString}
                    onSave={(iso) => setSearch({ date: iso, job: undefined })}
                    minYear={thisYear - 20}
                    maxYear={thisYear + 10}
                />

                {/* ── Plan history editor ────────────────────────────────── */}
                {historyRow != null && departmentId != null && (
                    <PlanHistoryDialog
                        open
                        onClose={() => setHistoryRow(null)}
                        departmentId={departmentId}
                        row={historyRow}
                        getString={getString}
                        createTargetMutation={createTargetMutation}
                        updateTargetMutation={updateTargetMutation}
                        deleteTargetMutation={deleteTargetMutation}
                    />
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
            </PageContainer>
        </AppShell>
    );
}

import { useState } from 'react';
import { PageBreadcrumbs } from '../../ui/PageBreadcrumbs';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import {
    Alert,
    Box,
    Button,
    Card,
    CardActionArea,
    CardContent,
    Chip,
    CircularProgress,
    Paper,
    Snackbar,
    Stack,
    ToggleButton,
    ToggleButtonGroup,
    Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ViewModuleIcon from '@mui/icons-material/ViewModule';
import ViewListIcon from '@mui/icons-material/ViewList';
import { DataGrid } from '@mui/x-data-grid';
import useString from '../../../hooks/useString';
import cfl from '../../../utils/helpers.ts';
import { useDataGridLocale } from '../../../hooks/useDataGridLocale';
import { useUserGridColumns } from '../../../hooks/useUserGridColumns';
import { UserGridTable } from '../../../utils/userGridTables';
import { useRecruitmentViewStore } from '../../../store/recruitmentViewStore';
import { centeredGridCellsSx } from '../../../utils/dataGridSx';
import ConfirmDeleteDialog from '../../ui/ConfirmDeleteDialog';
import { RECRUITMENT_TASK_QK } from '../../../utils/queryKeys';
import { fetchRecruitmentTasks, type RecruitmentStatusKey, type RecruitmentTask } from './recruitmentTaskApi';
import { useRecruitmentTaskColumns } from './useRecruitmentTaskColumns';
import { useRecruitmentTaskMutations } from './useRecruitmentTaskMutations';
import { RecruitmentTaskCreateDialog } from './RecruitmentTaskCreateDialog';
import { STATUS_COLOR, statusLabel } from './recruitmentStatus';

export function RecruitmentTasksPage() {
    const getString = useString();
    const navigate = useNavigate();
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
    const [createOpen, setCreateOpen] = useState(false);
    const [pendingDelete, setPendingDelete] = useState<RecruitmentTask | null>(null);
    const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 10 });
    // View mode persists per user (localStorage-backed zustand), so it's
    // remembered across navigation and reloads.
    const view = useRecruitmentViewStore((s) => s.view);
    const setView = useRecruitmentViewStore((s) => s.setView);

    const { data: rows = [], isLoading, error } = useQuery({
        queryKey: RECRUITMENT_TASK_QK,
        queryFn: fetchRecruitmentTasks,
        staleTime: 30 * 1000,
    });

    const { createMutation, statusMutation, deleteMutation } = useRecruitmentTaskMutations({
        setSnackbar,
        onCreateSuccess: () => setCreateOpen(false),
    });

    const localeText = useDataGridLocale();

    const handleOpen = (row: RecruitmentTask) =>
        navigate({ to: '/recruitment/$taskId', params: { taskId: String(row.id) } });

    const handleTransition = (row: RecruitmentTask, target: RecruitmentStatusKey) =>
        statusMutation.mutate({ id: row.id, statusKey: target });

    const columns = useRecruitmentTaskColumns({
        getString,
        onOpen: handleOpen,
        onTransition: handleTransition,
        onDelete: (row) => setPendingDelete(row),
        transitionPending: statusMutation.isPending,
        deletePending: deleteMutation.isPending,
    });

    // Per-user column visibility (which fields to show), persisted to localStorage.
    const userGridColumns = useUserGridColumns(UserGridTable.RECRUITMENT_TASKS, columns);

    return (
        <Box>
            <PageBreadcrumbs
                items={[
                    { to: '/', label: cfl(getString('home') || 'Home') },
                    { label: cfl(getString('recruitment') || 'Recruitment') },
                ]}
            />

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <Typography variant="h6" fontWeight={600} sx={{ flex: 1 }}>
                    {getString('recruitmentTasks') || 'Recruitment tasks'}
                </Typography>
                <ToggleButtonGroup
                    size="small"
                    exclusive
                    value={view}
                    onChange={(_, v) => v && setView(v)}
                >
                    <ToggleButton value="grid">
                        <ViewListIcon fontSize="small" />
                    </ToggleButton>
                    <ToggleButton value="cards">
                        <ViewModuleIcon fontSize="small" />
                    </ToggleButton>
                </ToggleButtonGroup>
                <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreateOpen(true)}>
                    {getString('createRecruitmentTask') || 'Create task'}
                </Button>
            </Box>

            {isLoading && (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                    <CircularProgress />
                </Box>
            )}

            {!isLoading && error && <Alert severity="error" sx={{ m: 2 }}>{(error as Error).message}</Alert>}

            {!isLoading && !error && view === 'grid' && (
                <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
                    <DataGrid
                        rows={rows}
                        columns={columns}
                        {...userGridColumns}
                        onRowDoubleClick={(params) => handleOpen(params.row as RecruitmentTask)}
                        paginationModel={paginationModel}
                        onPaginationModelChange={setPaginationModel}
                        pageSizeOptions={[10, 25, 50]}
                        disableRowSelectionOnClick
                        getRowId={(row) => row.id}
                        getRowHeight={() => 'auto'}
                        localeText={localeText}
                        hideFooterSelectedRowCount
                        sx={{ ...centeredGridCellsSx, '& .MuiDataGrid-cell': { py: 1 }, '& .MuiDataGrid-row': { cursor: 'pointer' } }}
                    />
                </Paper>
            )}

            {!isLoading && !error && view === 'cards' && (
                <Box
                    sx={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                        gap: 2,
                    }}
                >
                    {rows.map((t) => {
                        const key = t.status?.name;
                        return (
                            <Card key={t.id} variant="outlined">
                                <CardActionArea onClick={() => handleOpen(t)}>
                                    <CardContent>
                                        <Stack direction="row" alignItems="flex-start" spacing={1}>
                                            <Typography variant="subtitle1" fontWeight={600} sx={{ flex: 1 }}>
                                                {t.job?.name ?? t.job_id}
                                            </Typography>
                                            {key && (
                                                <Chip size="small" label={statusLabel(key, getString)} color={STATUS_COLOR[key]} />
                                            )}
                                        </Stack>
                                        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                                            {getString('openings') || 'Openings'}: {t.openings}
                                        </Typography>
                                        {t.department && (
                                            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                                                {t.department.name}
                                            </Typography>
                                        )}
                                        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                                            {getString('viewBoard') || 'View board →'}
                                        </Typography>
                                    </CardContent>
                                </CardActionArea>
                            </Card>
                        );
                    })}
                </Box>
            )}

            <RecruitmentTaskCreateDialog
                open={createOpen}
                onClose={() => setCreateOpen(false)}
                createMutation={createMutation}
            />

            <ConfirmDeleteDialog
                open={pendingDelete !== null}
                message={getString('confirmDeleteMessage')}
                itemLabel={pendingDelete?.job?.name}
                isDeleting={deleteMutation.isPending}
                onConfirm={() => {
                    if (pendingDelete) deleteMutation.mutate(pendingDelete.id);
                    setPendingDelete(null);
                }}
                onClose={() => setPendingDelete(null)}
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
        </Box>
    );
}

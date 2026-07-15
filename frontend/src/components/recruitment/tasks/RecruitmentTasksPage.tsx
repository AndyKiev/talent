import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from '@tanstack/react-router';
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
import AddIcon from '@mui/icons-material/Add';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import { DataGrid } from '@mui/x-data-grid';
import useString from '../../../hooks/useString';
import cfl from '../../../utils/helpers.ts';
import { useDataGridLocale } from '../../../hooks/useDataGridLocale';
import { centeredGridCellsSx } from '../../../utils/dataGridSx';
import ConfirmDeleteDialog from '../../people-review/ConfirmDeleteDialog';
import { RECRUITMENT_TASK_QK } from '../../../utils/queryKeys';
import { fetchRecruitmentTasks, type RecruitmentStatusKey, type RecruitmentTask } from './recruitmentTaskApi';
import { useRecruitmentTaskColumns } from './useRecruitmentTaskColumns';
import { useRecruitmentTaskMutations } from './useRecruitmentTaskMutations';
import { RecruitmentTaskCreateDialog } from './RecruitmentTaskCreateDialog';

export function RecruitmentTasksPage() {
    const getString = useString();
    const navigate = useNavigate();
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
    const [createOpen, setCreateOpen] = useState(false);
    const [pendingDelete, setPendingDelete] = useState<RecruitmentTask | null>(null);
    const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 10 });

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

    return (
        <Box>
            <Breadcrumbs separator={<NavigateNextIcon fontSize="small" />} sx={{ mb: 3 }}>
                <Link to="/" style={{ textDecoration: 'none', color: 'inherit' }}>
                    <Typography variant="body2" color="text.secondary">
                        {cfl(getString('home') || 'Home')}
                    </Typography>
                </Link>
                <Typography variant="body2" color="text.primary" fontWeight={600}>
                    {cfl(getString('recruitment') || 'Recruitment')}
                </Typography>
            </Breadcrumbs>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <Typography variant="h6" fontWeight={600} sx={{ flex: 1 }}>
                    {getString('recruitmentTasks') || 'Recruitment tasks'}
                </Typography>
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

            {!isLoading && !error && (
                <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
                    <DataGrid
                        rows={rows}
                        columns={columns}
                        paginationModel={paginationModel}
                        onPaginationModelChange={setPaginationModel}
                        pageSizeOptions={[10, 25, 50]}
                        disableRowSelectionOnClick
                        getRowId={(row) => row.id}
                        getRowHeight={() => 'auto'}
                        localeText={localeText}
                        hideFooterSelectedRowCount
                        sx={{ ...centeredGridCellsSx, '& .MuiDataGrid-cell': { py: 1 } }}
                    />
                </Paper>
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
                getString={getString}
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

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
    Alert,
    Box,
    Button,
    IconButton,
    Paper,
    Snackbar,
    Stack,
    Switch,
    Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { DataGrid, type GridColDef } from '@mui/x-data-grid';
import useString from '../../../../hooks/useString';
import { fetchRecruitmentDimensions, updateRecruitmentDimension, type RecruitmentDimension } from './recruitmentDimensionApi';
import { useRecruitmentDimensionMutations } from './useRecruitmentDimensionMutations';
import { RecruitmentDimensionForm } from './RecruitmentDimensionForm';
import { useArrowReorder } from '../../../../hooks/useArrowReorder';
import { useDataGridLocale } from '../../../../hooks/useDataGridLocale';
import { centeredGridCellsSx } from '../../../../utils/dataGridSx';
import { RECRUITMENT_DIMENSIONS_QK } from '../../../../utils/queryKeys';
import ConfirmDialog from '../../../ui/ConfirmDialog';
import ConfirmDeleteDialog from '../../../ui/ConfirmDeleteDialog';
import { AsyncContent } from '../../../ui/AsyncContent';

export function RecruitmentDimensionCrud() {
    const getString = useString();
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
    const [formOpen, setFormOpen] = useState(false);
    const [editing, setEditing] = useState<RecruitmentDimension | null>(null);
    const [pendingToggle, setPendingToggle] = useState<RecruitmentDimension | null>(null);
    const [pendingDelete, setPendingDelete] = useState<RecruitmentDimension | null>(null);
    const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 10 });

    const { data: rows = [], isLoading, error } = useQuery({
        queryKey: RECRUITMENT_DIMENSIONS_QK,
        queryFn: fetchRecruitmentDimensions,
        staleTime: 2 * 60 * 1000,
    });

    const sortedRows = useMemo(
        () => [...rows].sort((a, b) => (a.sort_order - b.sort_order) || (a.id - b.id)),
        [rows],
    );

    const { createMutation, updateMutation, deleteMutation } = useRecruitmentDimensionMutations({
        setSnackbar,
        onCreateSuccess: () => setFormOpen(false),
        onUpdateSuccess: () => setFormOpen(false),
    });

    const localeText = useDataGridLocale();

    const { orderColumn } = useArrowReorder<RecruitmentDimension>({
        rows: sortedRows,
        updateSortOrder: (id, sort_order) => updateRecruitmentDimension({ id, data: { sort_order } }),
        invalidateKeys: [RECRUITMENT_DIMENSIONS_QK],
        getString,
        onError: (message) => setSnackbar({ open: true, message, severity: 'error' }),
    });

    const openCreate = () => {
        setEditing(null);
        setFormOpen(true);
    };
    const openEdit = (row: RecruitmentDimension) => {
        setEditing(row);
        setFormOpen(true);
    };

    const columns: GridColDef<RecruitmentDimension>[] = [
        orderColumn,
        { field: 'id', headerName: getString('idColumn'), width: 60 },
        {
            field: 'color',
            headerName: getString('colorCol'),
            width: 80,
            sortable: false,
            renderCell: (params) => (
                <Box
                    sx={{
                        width: 22,
                        height: 22,
                        borderRadius: '4px',
                        bgcolor: params.row.color,
                        border: '1px solid',
                        borderColor: 'divider',
                    }}
                    title={params.row.color}
                />
            ),
        },
        { field: 'name', headerName: getString('name'), flex: 1, minWidth: 200 },
        { field: 'key', headerName: getString('keyLabel'), width: 200 },
        { field: 'description', headerName: getString('descriptionCol'), flex: 1, minWidth: 200 },
        {
            field: 'is_active',
            headerName: getString('active'),
            width: 90,
            sortable: false,
            renderCell: (params) => (
                <Switch
                    size="small"
                    checked={params.row.is_active}
                    onChange={() => setPendingToggle(params.row)}
                    disabled={updateMutation.isPending}
                />
            ),
        },
        {
            field: 'actions',
            headerName: '',
            width: 90,
            sortable: false,
            renderCell: (params) => (
                <Stack direction="row" spacing={0.5}>
                    <IconButton size="small" onClick={() => openEdit(params.row)}>
                        <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                        size="small"
                        color="error"
                        onClick={() => setPendingDelete(params.row)}
                        disabled={deleteMutation.isPending}
                    >
                        <DeleteIcon fontSize="small" />
                    </IconButton>
                </Stack>
            ),
        },
    ];

    return (
        <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <Typography variant="h6" fontWeight={600} sx={{ flex: 1 }}>
                    {getString('recruitmentDimensions')}
                </Typography>
                <Button variant="contained" size="medium" startIcon={<AddIcon />} onClick={openCreate}>
                    {getString('addRecruitmentDimension')}
                </Button>
            </Box>

            <AsyncContent isLoading={isLoading} error={error}>
                <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
                    <DataGrid
                        rows={sortedRows}
                        columns={columns}
                        paginationModel={paginationModel}
                        onPaginationModelChange={setPaginationModel}
                        pageSizeOptions={[5, 10, 25]}
                        disableRowSelectionOnClick
                        getRowId={(row) => row.id}
                        getRowHeight={() => 'auto'}
                        localeText={localeText}
                        hideFooterSelectedRowCount
                        sx={{ ...centeredGridCellsSx, '& .MuiDataGrid-cell': { alignItems: 'center', py: 1 } }}
                    />
                </Paper>
            </AsyncContent>

            <RecruitmentDimensionForm
                open={formOpen}
                onClose={() => setFormOpen(false)}
                editing={editing}
                nextSortOrder={sortedRows.length}
                createMutation={createMutation}
                updateMutation={updateMutation}
            />

            <ConfirmDialog
                open={pendingToggle !== null}
                title={getString('confirmToggleActiveTitle')}
                message={
                    pendingToggle?.is_active
                        ? getString('confirmDeactivateMessage')
                        : getString('confirmActivateMessage')
                }
                confirmColor="warning"
                isPending={updateMutation.isPending}
                onConfirm={() => {
                    if (pendingToggle) {
                        updateMutation.mutate({
                            id: pendingToggle.id,
                            data: { is_active: !pendingToggle.is_active },
                        });
                    }
                    setPendingToggle(null);
                }}
                onClose={() => setPendingToggle(null)}
            />

            <ConfirmDeleteDialog
                open={pendingDelete !== null}
                message={getString('confirmDeleteMessage')}
                itemLabel={pendingDelete?.name}
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

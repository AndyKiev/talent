import { useCallback, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
    Alert,
    Box,
    Button,
    Paper,
    Snackbar,
    Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { DataGrid } from '@mui/x-data-grid';

import { fetchMenusManage, type MenuAdmin } from './menuAdminApi';
import { useMenuMutations } from './useMenuMutations';
import { useMenuColumns } from './useMenuColumns';
import { MenuForm } from './MenuForm';
import { MenuDeleteDialog } from './MenuDeleteDialog';
import { fetchUserGroups } from '../../../admin/user_groups/userGroupApi';
import { useDataGridLocale } from '../../../../hooks/useDataGridLocale';
import useString from '../../../../hooks/useString';
import cfl from '../../../../utils/helpers';
import { MENUS_MANAGE_QK, USER_GROUP_QK } from '../../../../utils/queryKeys';
import { AsyncContent } from '../../../ui/AsyncContent';

export function MenuCrud() {
    const getString = useString();

    const [snackbar, setSnackbar] = useState({
        open: false,
        message: '',
        severity: 'success' as 'success' | 'error',
    });
    const [formOpen, setFormOpen] = useState(false);
    const [editing, setEditing] = useState<MenuAdmin | null>(null);
    const [rowToDelete, setRowToDelete] = useState<MenuAdmin | null>(null);
    const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 10 });

    const { data: rows = [], isLoading, error } = useQuery({
        queryKey: MENUS_MANAGE_QK,
        queryFn: fetchMenusManage,
        staleTime: 2 * 60 * 1000,
    });

    const { data: groups = [] } = useQuery({
        queryKey: USER_GROUP_QK,
        queryFn: fetchUserGroups,
        staleTime: 5 * 60 * 1000,
    });

    const groupNamesById = useMemo(
        () => new Map(groups.map((g) => [g.id, g.name])),
        [groups],
    );
    const menuKeysById = useMemo(
        () => new Map(rows.map((m) => [m.id, getString(m.label_key) || m.key])),
        [rows, getString],
    );

    const { createMutation, updateMutation, deleteMutation } = useMenuMutations({
        setSnackbar,
        deleteSuccessMessage: getString('menuDeleteSuccessShort') || 'Menu deleted',
        onCreateSuccess: () => setFormOpen(false),
        onUpdateSuccess: () => {
            setFormOpen(false);
            setEditing(null);
        },
        onDeleteSuccess: () => setRowToDelete(null),
        onDeleteError: () => setRowToDelete(null),
    });

    const localeText = useDataGridLocale();

    const handleAdd = useCallback(() => {
        setEditing(null);
        setFormOpen(true);
    }, []);

    const handleEdit = useCallback((row: MenuAdmin) => {
        setEditing(row);
        setFormOpen(true);
    }, []);

    const handleConfirmDelete = useCallback(() => {
        if (rowToDelete) deleteMutation.mutate(rowToDelete.id);
    }, [rowToDelete, deleteMutation]);

    const columns = useMenuColumns({
        getString,
        groupNamesById,
        menuKeysById,
        onEdit: handleEdit,
        onDelete: setRowToDelete,
        deleteIsPending: deleteMutation.isPending,
    });

    return (
        <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <Typography variant="h6" fontWeight={600} sx={{ flex: 1 }}>
                    {getString('menus') || 'Menus'}
                </Typography>
                <Button variant="contained" startIcon={<AddIcon />} onClick={handleAdd}>
                    {cfl(getString('addMenu')) || 'Add Menu'}
                </Button>
            </Box>

            <AsyncContent isLoading={isLoading} error={error}>
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
                        sx={{ '& .MuiDataGrid-cell': { alignItems: 'center', py: 1 } }}
                    />
                </Paper>
            </AsyncContent>

            <MenuForm
                open={formOpen}
                onClose={() => {
                    setFormOpen(false);
                    setEditing(null);
                }}
                editing={editing}
                groups={groups}
                menus={rows}
                createMutation={createMutation}
                updateMutation={updateMutation}
            />

            <MenuDeleteDialog
                row={rowToDelete}
                isPending={deleteMutation.isPending}
                onConfirm={handleConfirmDelete}
                onCancel={() => setRowToDelete(null)}
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

// src/components/admin/users/UsersCrud.tsx
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
    Alert,
    Box,
    Paper,
    Snackbar,
    Typography,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';

import {
    fetchEmployeesWithGroups,
    type EmployeeWithGroups,
} from './employeeUserGroupApi';
import { useUserColumns, type TypeColumn } from './useUserColumns';
import { UserGroupsManageDialog } from './UserGroupsManageDialog';
import { useDataGridLocale } from '../../../hooks/useDataGridLocale';
import useString from '../../../hooks/useString';
import str from '../../../strings/str';
import { EMPLOYEE_USER_GROUP_QK } from '../../../utils/queryKeys.ts';
import { AsyncContent } from '../../ui/AsyncContent';

const AUTH_TYPE_NAME = 'authorisation';

export function UsersCrud() {
    const getString = useString({ str });
    const localeText = useDataGridLocale();

    const [snackbar, setSnackbar] = useState({
        open: false,
        message: '',
        severity: 'success' as 'success' | 'error',
    });
    const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 10 });

    const [manage, setManage] = useState<{
        employee: EmployeeWithGroups;
        typeId: number;
        typeName: string;
    } | null>(null);

    const { data: rows = [], isLoading, error } = useQuery({
        queryKey: EMPLOYEE_USER_GROUP_QK,
        queryFn: fetchEmployeesWithGroups,
        staleTime: 60 * 1000,
    });

    // Discover distinct user_group_types across all rows → one column each.
    // 'authorisation' is surfaced first to match the preferred default.
    const typeColumns: TypeColumn[] = useMemo(() => {
        const map = new Map<number, string>();
        for (const r of rows) {
            for (const g of r.groups) {
                if (!map.has(g.user_group_type_id)) {
                    map.set(g.user_group_type_id, g.user_group_type_name || `type ${g.user_group_type_id}`);
                }
            }
        }
        const list = Array.from(map.entries()).map(([typeId, typeName]) => ({ typeId, typeName }));
        list.sort((a, b) => {
            if (a.typeName.toLowerCase() === AUTH_TYPE_NAME) return -1;
            if (b.typeName.toLowerCase() === AUTH_TYPE_NAME) return 1;
            return a.typeName.localeCompare(b.typeName);
        });
        return list;
    }, [rows]);

    const columns = useUserColumns({
        getString,
        typeColumns,
        onManageClick: (row, typeId, typeName) => setManage({ employee: row, typeId, typeName }),
    });

    // Keep the dialog's employee in sync with refetched rows after link/unlink.
    const liveEmployee = useMemo(
        () => (manage ? rows.find((r) => r.id === manage.employee.id) ?? manage.employee : null),
        [manage, rows],
    );

    return (
        <Box>
            <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
                {getString('users') || 'Users'}
            </Typography>

            <AsyncContent isLoading={isLoading} error={error}>
                <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
                    <DataGrid
                        rows={rows}
                        columns={columns}
                        paginationModel={paginationModel}
                        onPaginationModelChange={setPaginationModel}
                        pageSizeOptions={[5, 10, 25, 50]}
                        disableRowSelectionOnClick
                        getRowId={(row) => row.id}
                        getRowHeight={() => 'auto'}
                        localeText={localeText}
                        hideFooterSelectedRowCount
                        sx={{ '& .MuiDataGrid-cell': { alignItems: 'center', py: 1 } }}
                    />
                </Paper>
            </AsyncContent>

            <UserGroupsManageDialog
                open={!!manage}
                employee={liveEmployee}
                typeId={manage?.typeId ?? null}
                typeName={manage?.typeName ?? null}
                getString={getString}
                setSnackbar={setSnackbar}
                onClose={() => setManage(null)}
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

// src/components/employees/headcount_plan/FactEmployeesPanel.tsx
//
// The employees behind one fact qty — shown below the calc grid after the
// personnel icon is clicked on a row. Same look as the employees-menu grid
// (code | name); a row click opens the employee card.
import { useQuery } from '@tanstack/react-query';
import {
    Alert,
    Box,
    Chip,
    CircularProgress,
    IconButton,
    Paper,
    Tooltip,
    Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import PeopleAltOutlinedIcon from '@mui/icons-material/PeopleAltOutlined';
import ScheduleIcon from '@mui/icons-material/Schedule';
import { DataGrid, type GridColDef, type GridRenderCellParams } from '@mui/x-data-grid';
import { useNavigate } from '@tanstack/react-router';
import { fetchFactEmployees, type FactEmployee, type HeadcountCalcRow } from './headcountPlanApi';
import { useEmployeeLandingSegment } from '../employeeLandingTarget';
import { HEADCOUNT_FACT_EMPLOYEES_QK } from '../../../utils/queryKeys';
import { useDataGridLocale } from '../../../hooks/useDataGridLocale';
import { centeredGridCellsSx } from '../../../utils/dataGridSx';
import { formatDate } from '../../../utils/date';
import type { GetStringFn } from '../../../types/getStringFn';
import cfl from '../../../utils/helpers.ts';

interface Props {
    departmentId: number;
    isoDate: string;
    row: HeadcountCalcRow;
    getString: GetStringFn;
    onClose: () => void;
}

export function FactEmployeesPanel({ departmentId, isoDate, row, getString, onClose }: Props) {
    const navigate = useNavigate();
    const localeText = useDataGridLocale();
    // Per-user preference for which employee-card tab to land on.
    const { segment } = useEmployeeLandingSegment();

    const { data: employees = [], isLoading, error } = useQuery({
        queryKey: HEADCOUNT_FACT_EMPLOYEES_QK(departmentId, isoDate, row.job_id),
        queryFn: () => fetchFactEmployees(departmentId, isoDate, row.job_id),
    });

    const columns: GridColDef[] = [
        { field: 'code', headerName: cfl(getString('code')), width: 140 },
        {
            field: 'name',
            headerName: cfl(getString('employeeName')),
            flex: 1,
            minWidth: 260,
            renderCell: (params: GridRenderCellParams<FactEmployee>) => (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body2">{params.row.name}</Typography>
                    {params.row.is_pending && (
                        <Tooltip title={getString('factPendingEmployeeHint')}>
                            <Chip
                                icon={<ScheduleIcon />}
                                label={getString('notApplied')}
                                size="small"
                                color="warning"
                                variant="outlined"
                                sx={{ height: 20, fontSize: '0.7rem' }}
                            />
                        </Tooltip>
                    )}
                </Box>
            ),
        },
    ];

    return (
        <Paper
            elevation={0}
            sx={{ border: '1px solid', borderColor: 'divider', mt: 2, p: 1.5 }}
        >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <PeopleAltOutlinedIcon color="action" sx={{ fontSize: 18 }} />
                <Typography variant="subtitle2" fontWeight={600} sx={{ flex: 1 }}>
                    {getString('factEmployeesTitle', {
                        jobName: row.job_name,
                        date: formatDate(isoDate),
                    })}
                </Typography>
                <Tooltip title={getString('close')}>
                    <IconButton size="small" onClick={onClose}>
                        <CloseIcon fontSize="inherit" />
                    </IconButton>
                </Tooltip>
            </Box>
            {isLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                    <CircularProgress size={24} />
                </Box>
            ) : error ? (
                <Alert severity="error">{(error as Error).message}</Alert>
            ) : (
                <DataGrid
                    rows={employees}
                    columns={columns}
                    getRowId={(r) => r.id}
                    autoHeight
                    density="compact"
                    disableRowSelectionOnClick
                    hideFooterSelectedRowCount
                    localeText={localeText}
                    pageSizeOptions={[10, 25]}
                    initialState={{
                        pagination: { paginationModel: { page: 0, pageSize: 10 } },
                    }}
                    onRowClick={(params) =>
                        navigate({ to: `/employees/${params.row.id}/${segment}` as '/' })
                    }
                    sx={{ '& .MuiDataGrid-row': { cursor: 'pointer' }, ...centeredGridCellsSx }}
                />
            )}
        </Paper>
    );
}

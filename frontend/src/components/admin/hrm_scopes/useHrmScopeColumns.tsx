// src/components/admin/hrm_scopes/useHrmScopeColumns.tsx
import type { GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import { Box, Chip, IconButton, Tooltip } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';

import type { HrmScope } from './hrmScopeApi';
import type { GetStringFn } from '../../../types/getStringFn';
import { formatToUkrDate } from '../../../utils/dateFormatter.ts';
import cfl from '../../../utils/helpers.ts';

interface Params {
    getString: GetStringFn;
    onDelete: (row: HrmScope) => void;
}

export function useHrmScopeColumns({ getString, onDelete }: Params): GridColDef<HrmScope>[] {
    return [
        {
            field: 'department_category_name',
            headerName: cfl(getString('category')) || 'Category',
            width: 150,
            renderCell: (p: GridRenderCellParams<HrmScope>) => p.row.department_category_name || '—',
        },
        {
            field: 'department_name',
            headerName: cfl(getString('department')) || 'Department',
            flex: 1,
            minWidth: 160,
            renderCell: (p: GridRenderCellParams<HrmScope>) => p.row.department_name || '—',
        },
        {
            field: 'start_date',
            headerName: cfl(getString('startDate')) || 'Start',
            width: 120,
            renderCell: (p: GridRenderCellParams<HrmScope>) => formatToUkrDate(p.row.start_date),
        },
        {
            field: 'end_date',
            headerName: cfl(getString('endDate')) || 'End',
            width: 120,
            renderCell: (p: GridRenderCellParams<HrmScope>) => formatToUkrDate(p.row.end_date),
        },
        {
            field: 'is_currently_active',
            headerName: cfl(getString('status')) || 'Status',
            width: 130,
            renderCell: (p: GridRenderCellParams<HrmScope>) => (
                <Chip
                    size="small"
                    icon={<FiberManualRecordIcon sx={{ fontSize: 12 }} />}
                    label={
                        p.row.is_currently_active
                            ? getString('active') || 'active'
                            : getString('inactive') || 'inactive'
                    }
                    color={p.row.is_currently_active ? 'success' : 'default'}
                    variant={p.row.is_currently_active ? 'filled' : 'outlined'}
                />
            ),
        },
        {
            field: 'actions',
            headerName: '',
            width: 60,
            sortable: false,
            filterable: false,
            renderCell: (p: GridRenderCellParams<HrmScope>) => (
                <Box>
                    <Tooltip title={getString('remove') || 'Remove'}>
                        <IconButton size="small" color="error" onClick={() => onDelete(p.row)}>
                            <DeleteIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                </Box>
            ),
        },
    ];
}

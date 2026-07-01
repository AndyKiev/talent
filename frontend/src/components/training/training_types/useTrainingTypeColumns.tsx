// src/components/training/training_types/useTrainingTypeColumns.tsx
import type { GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import { Box, IconButton, Tooltip } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';

import type { TrainingType } from './trainingTypeApi.ts';
import cfl from '../../../utils/helpers.ts';
import type { GetStringFn } from '../../../types/getStringFn.ts';
import { formatToUkrDate } from '../../../utils/dateFormatter.ts';

interface Params {
    getString: GetStringFn;
    onEditClick: (row: TrainingType) => void;
    onDeleteClick: (row: TrainingType) => void;
    deleteIsPending: boolean;
}

export function useTrainingTypeColumns({
    getString,
    onEditClick,
    onDeleteClick,
    deleteIsPending,
}: Params): GridColDef[] {
    return [
        { field: 'name', headerName: cfl(getString('name')) || 'Name', flex: 1, minWidth: 180 },
        { field: 'key', headerName: cfl(getString('key')) || 'Key', width: 160 },
        {
            field: 'training_category_name',
            headerName: cfl(getString('trainingCategory')) || 'Category',
            width: 160,
        },
        {
            field: 'training_link_type_key',
            headerName: cfl(getString('trainingLinkType')) || 'Link Type',
            width: 160,
        },
        {
            field: 'target',
            headerName: cfl(getString('target')) || 'Target',
            flex: 1,
            minWidth: 180,
            valueGetter: (_value, row: TrainingType) => {
                const names = row.job_category_keys.length > 0 ? row.job_category_keys : row.job_names;
                return names.length > 0 ? names.join(', ') : '—';
            },
        },
        {
            field: 'created_at',
            headerName: getString('createdAt'),
            width: 160,
            renderCell: (params: GridRenderCellParams<TrainingType>) =>
                formatToUkrDate(params.row.created_at),
        },
        {
            field: '_actions',
            headerName: '',
            width: 96,
            sortable: false,
            filterable: false,
            disableColumnMenu: true,
            renderCell: (params: GridRenderCellParams<TrainingType>) => (
                <Box sx={{ display: 'flex', alignItems: 'center', height: '100%', gap: 0.5 }}>
                    <Tooltip title={getString('edit') || 'Edit'}>
                        <IconButton
                            size="small"
                            onClick={(e) => { e.stopPropagation(); onEditClick(params.row); }}
                        >
                            <EditIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title={getString('delete') || 'Delete'}>
                        <span>
                            <IconButton
                                size="small"
                                color="error"
                                onClick={(e) => { e.stopPropagation(); onDeleteClick(params.row); }}
                                disabled={deleteIsPending}
                            >
                                <DeleteIcon fontSize="small" />
                            </IconButton>
                        </span>
                    </Tooltip>
                </Box>
            ),
        },
    ];
}

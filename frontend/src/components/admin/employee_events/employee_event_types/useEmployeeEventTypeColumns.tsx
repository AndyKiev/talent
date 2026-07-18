// src/components/admin/employee_event_types/useEmployeeEventTypeColumns.tsx
import React from 'react';
import type { GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import { Box, IconButton, Tooltip } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';

import type { EmployeeEventType } from './employeeEventTypeApi.ts';
import type { GetStringFn } from '../../../../types/getStringFn.ts';
import { formatToUkrDate } from '../../../../utils/dateFormatter.ts';
import { makeTextEditCol, type EditingState } from '../../../../utils/columnBuilders';
export type { EditingState };

interface Params {
    getString: GetStringFn;
    editingState: EditingState;
    onEditFieldClick: (row: EmployeeEventType, field: string, e: React.MouseEvent) => void;
    onRequestSave: (row: EmployeeEventType, field: string, newValue: string) => void;
    onCancelEdit: () => void;
    updateIsPending: boolean;
    onDeleteClick: (row: EmployeeEventType) => void;
    deleteIsPending: boolean;
}

export function useEmployeeEventTypeColumns({
                                                getString,
                                                editingState,
                                                onEditFieldClick,
                                                onRequestSave,
                                                onCancelEdit,
                                                updateIsPending,
                                                onDeleteClick,
                                                deleteIsPending,
                                            }: Params): GridColDef[] {

    const textEditCol = makeTextEditCol<EmployeeEventType>({
        getString, editingState, onEditFieldClick, onRequestSave, onCancelEdit, updateIsPending,
    });

    return [
        textEditCol('code', 'code', 160),
        textEditCol('name', 'name', 200, 1),
        textEditCol('description', 'description', 280, 1),
        {
            field: 'created_at',
            headerName: getString('createdAt'),
            width: 160,
            renderCell: (params: GridRenderCellParams<EmployeeEventType>) =>
                formatToUkrDate(params.row.created_at),
        },
        {
            field: '_actions',
            headerName: '',
            width: 56,
            sortable: false,
            filterable: false,
            disableColumnMenu: true,
            renderCell: (params: GridRenderCellParams<EmployeeEventType>) => (
                <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
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

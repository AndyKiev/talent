// src/components/admin/department_categories/useDepartmentCategoryColumns.tsx
import React from 'react';
import type { GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import { Box, IconButton, Tooltip } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';

import type { DepartmentCategory } from './departmentCategoryApi.ts';
import type { GetStringFn } from '../../../types/getStringFn.ts';
import { formatToUkrDate } from '../../../utils/dateFormatter.ts';
import { makeTextEditCol, makeToggleCol, type EditingState } from '../../../utils/columnBuilders';
export type { EditingState };

interface Params {
    getString: GetStringFn;
    editingState: EditingState;
    onEditFieldClick: (row: DepartmentCategory, field: string, e: React.MouseEvent) => void;
    onRequestSave: (row: DepartmentCategory, field: string, newValue: string) => void;
    onCancelEdit: () => void;
    updateIsPending: boolean;
    onToggleActive: (row: DepartmentCategory) => void;
    onToggleMain: (row: DepartmentCategory) => void;
    onToggleResponsibility: (row: DepartmentCategory) => void;
    toggleIsPending: boolean;
    onDeleteClick: (row: DepartmentCategory) => void;
    deleteIsPending: boolean;
    orderColumn?: GridColDef;
}

export function useDepartmentCategoryColumns({
    getString,
    editingState,
    onEditFieldClick,
    onRequestSave,
    onCancelEdit,
    updateIsPending,
    onToggleActive,
    onToggleMain,
    onToggleResponsibility,
    toggleIsPending,
    onDeleteClick,
    deleteIsPending,
    orderColumn,
}: Params): GridColDef[] {

    const textEditCol = makeTextEditCol<DepartmentCategory>({
        getString, editingState, onEditFieldClick, onRequestSave, onCancelEdit, updateIsPending,
    });

    const toggleCol = makeToggleCol<DepartmentCategory>({ getString, toggleIsPending });

    return [
        ...(orderColumn ? [orderColumn] : []),
        textEditCol('name', 'name', 200, 1),
        textEditCol('key', 'key', 160, 0.7),
        textEditCol('description', 'description', 240, 1),
        toggleCol('is_active', 'isActive', onToggleActive),
        toggleCol('is_main', 'isMain', onToggleMain),
        toggleCol('is_responsibility', 'isResponsibility', onToggleResponsibility),
        {
            field: 'created_at',
            headerName: getString('createdAt'),
            width: 160,
            renderCell: (params: GridRenderCellParams<DepartmentCategory>) =>
                formatToUkrDate(params.row.created_at),
        },
        {
            field: '_actions',
            headerName: '',
            width: 56,
            sortable: false,
            filterable: false,
            disableColumnMenu: true,
            renderCell: (params: GridRenderCellParams<DepartmentCategory>) => (
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

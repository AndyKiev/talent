// src/components/admin/department_types/useDepartmentTypeColumns.tsx
import React from 'react';
import type { GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import { Box, Switch } from '@mui/material';

import type { DepartmentType } from './departmentTypeApi.ts';
import cfl from '../../../utils/helpers.ts';
import type { GetStringFn } from '../../../types/getStringFn.ts';
import { formatToUkrDate } from '../../../utils/dateFormatter.ts';
import { makeTextEditCol, deleteActionCol, type EditingState } from '../../../utils/columnBuilders';

interface Params {
    getString: GetStringFn;
    editingState: EditingState;
    onEditFieldClick: (row: DepartmentType, field: string, e: React.MouseEvent) => void;
    onRequestSave: (row: DepartmentType, field: string, newValue: string) => void;
    onCancelEdit: () => void;
    updateIsPending: boolean;
    onToggleActive: (row: DepartmentType) => void;
    toggleIsPending: boolean;
    onDeleteClick: (row: DepartmentType) => void;
    deleteIsPending: boolean;
}

export function useDepartmentTypeColumns({
    getString,
    editingState,
    onEditFieldClick,
    onRequestSave,
    onCancelEdit,
    updateIsPending,
    onToggleActive,
    toggleIsPending,
    onDeleteClick,
    deleteIsPending,
}: Params): GridColDef[] {

    const textEditCol = makeTextEditCol<DepartmentType>({
        getString, editingState, onEditFieldClick, onRequestSave, onCancelEdit, updateIsPending,
    });

    return [
        textEditCol('name', 'name', 200, 1),
        textEditCol('description', 'description', 240, 1),
        {
            field: 'is_active',
            headerName: cfl(getString('isActive')) || 'Active',
            width: 120,
            sortable: false,
            renderCell: (params: GridRenderCellParams<DepartmentType>) => {
                const row = params.row;
                return (
                    <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
                        <Switch
                            size="small"
                            checked={row.is_active}
                            onChange={() => onToggleActive(row)}
                            disabled={toggleIsPending}
                            onClick={(e) => e.stopPropagation()}
                        />
                    </Box>
                );
            },
        },
        {
            field: 'created_at',
            headerName: getString('createdAt'),
            width: 160,
            renderCell: (params: GridRenderCellParams<DepartmentType>) =>
                formatToUkrDate(params.row.created_at),
        },
        deleteActionCol<DepartmentType>({ getString, onDeleteClick, deleteIsPending }),
    ];
}

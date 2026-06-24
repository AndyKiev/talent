// src/components/admin/department_categories/useDepartmentCategoryColumns.tsx
import React from 'react';
import type { GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import { Box, IconButton, Switch, Tooltip } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';

import type { DepartmentCategory } from './departmentCategoryApi.ts';
import cfl from '../../../utils/helpers.ts';
import type { GetStringFn } from '../../../types/getStringFn.ts';
import { TextEditCell } from '../TextEditCell.tsx';
import { ReadonlyCell } from '../ReadonlyCell.tsx';
import { formatToUkrDate } from '../../../utils/dateFormatter.ts';

export interface EditingState {
    userId: number | null;
    field: string | null;
}

interface Params {
    getString: GetStringFn;
    editingState: EditingState;
    onEditFieldClick: (row: DepartmentCategory, field: string, e: React.MouseEvent) => void;
    onRequestSave: (row: DepartmentCategory, field: string, newValue: string) => void;
    onCancelEdit: () => void;
    updateIsPending: boolean;
    onToggleActive: (row: DepartmentCategory) => void;
    onToggleMain: (row: DepartmentCategory) => void;
    toggleIsPending: boolean;
    onDeleteClick: (row: DepartmentCategory) => void;
    deleteIsPending: boolean;
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
    toggleIsPending,
    onDeleteClick,
    deleteIsPending,
}: Params): GridColDef[] {

    function textEditCol(
        field: keyof DepartmentCategory,
        headerKey: string,
        width: number,
        flex?: number,
    ): GridColDef {
        return {
            field: field as string,
            headerName: cfl(getString(headerKey)) || headerKey,
            width: flex ? undefined : width,
            flex,
            renderCell: (params: GridRenderCellParams<DepartmentCategory>) => {
                const row = params.row;
                const isEditing = editingState.userId === row.id && editingState.field === field;
                return isEditing ? (
                    <TextEditCell
                        value={String(row[field] ?? '')}
                        onSave={(val) => onRequestSave(row, field as string, val)}
                        onCancel={onCancelEdit}
                        isPending={updateIsPending}
                    />
                ) : (
                    <ReadonlyCell
                        value={String(row[field] ?? '')}
                        onEdit={(e) => onEditFieldClick(row, field as string, e)}
                        editTitle={getString(`edit${cfl(field)}`) || `Edit ${field}`}
                        placeholder="—"
                    />
                );
            },
        };
    }

    function toggleCol(
        field: 'is_active' | 'is_main',
        headerKey: string,
        onToggle: (row: DepartmentCategory) => void,
    ): GridColDef {
        return {
            field,
            headerName: cfl(getString(headerKey)) || headerKey,
            width: 120,
            sortable: false,
            renderCell: (params: GridRenderCellParams<DepartmentCategory>) => (
                <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
                    <Switch
                        size="small"
                        checked={params.row[field]}
                        onChange={() => onToggle(params.row)}
                        disabled={toggleIsPending}
                        onClick={(e) => e.stopPropagation()}
                    />
                </Box>
            ),
        };
    }

    return [
        textEditCol('name', 'name', 200, 1),
        textEditCol('key', 'key', 160, 0.7),
        textEditCol('description', 'description', 240, 1),
        toggleCol('is_active', 'isActive', onToggleActive),
        toggleCol('is_main', 'isMain', onToggleMain),
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

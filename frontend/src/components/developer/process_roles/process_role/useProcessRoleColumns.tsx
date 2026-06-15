// src/components/developer/process_roles/process_role/useProcessRoleColumns.tsx
import React from 'react';
import type { GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import { Box, IconButton, Switch, Tooltip, Typography } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';

import type { ProcessRole } from './processRoleApi.ts';
import cfl from '../../../../utils/capitalizeFirstLetter.ts';
import type { GetStringFn } from '../../../../types/getStringFn.ts';
import { TextEditCell } from '../../../admin/TextEditCell.tsx';
import { ReadonlyCell } from '../../../admin/ReadonlyCell.tsx';
import { formatToUkrDate } from '../../../../utils/dateFormatter.ts';

export interface EditingState {
    rowId: number | null;
    field: string | null;
}

interface Params {
    getString: GetStringFn;
    editingState: EditingState;
    onEditFieldClick: (row: ProcessRole, field: string, e: React.MouseEvent) => void;
    onRequestSave: (row: ProcessRole, field: string, newValue: string) => void;
    onCancelEdit: () => void;
    updateIsPending: boolean;
    onToggleActive: (row: ProcessRole) => void;
    toggleIsPending: boolean;
    onDeleteClick: (row: ProcessRole) => void;
    deleteIsPending: boolean;
}

export function useProcessRoleColumns({
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

    function textEditCol(
        field: keyof ProcessRole,
        headerKey: string,
        width: number,
        flex?: number,
    ): GridColDef {
        return {
            field: field as string,
            headerName: cfl(getString(headerKey)) || headerKey,
            width: flex ? undefined : width,
            flex,
            renderCell: (params: GridRenderCellParams<ProcessRole>) => {
                const row = params.row;
                const isEditing = editingState.rowId === row.id && editingState.field === field;
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
                        editTitle={getString(`edit_${field}`) || `Edit ${field}`}
                        placeholder="—"
                    />
                );
            },
        };
    }

    return [
        {
            field: 'process_name',
            headerName: cfl(getString('process')) || 'Process',
            width: 200,
            flex: 0.8,
            renderCell: (params: GridRenderCellParams<ProcessRole>) => (
                <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
                    {params.row.process_name ?? '—'}
                </Typography>
            ),
        },
        textEditCol('name', 'name', 200, 1),
        textEditCol('key', 'key', 160, 0.7),
        {
            field: 'link_target',
            headerName: cfl(getString('linkTarget')) || 'Links to',
            width: 130,
            sortable: false,
            renderCell: (params: GridRenderCellParams<ProcessRole>) => (
                <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
                    {params.row.link_target === 'department'
                        ? (getString('linkTargetDepartment') || 'Departments')
                        : (getString('linkTargetEmployee') || 'Employees')}
                </Typography>
            ),
        },
        {
            field: 'is_active',
            headerName: cfl(getString('isActive')) || 'isActive',
            width: 120,
            sortable: false,
            renderCell: (params: GridRenderCellParams<ProcessRole>) => (
                <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
                    <Switch
                        size="small"
                        checked={params.row.is_active}
                        onChange={() => onToggleActive(params.row)}
                        disabled={toggleIsPending}
                        onClick={(e) => e.stopPropagation()}
                    />
                </Box>
            ),
        },
        {
            field: 'created_at',
            headerName: getString('createdAt'),
            width: 160,
            renderCell: (params: GridRenderCellParams<ProcessRole>) =>
                formatToUkrDate(params.row.created_at),
        },
        {
            field: '_actions',
            headerName: '',
            width: 56,
            sortable: false,
            filterable: false,
            disableColumnMenu: true,
            renderCell: (params: GridRenderCellParams<ProcessRole>) => (
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

// src/components/developer/process_roles/process/useProcessColumns.tsx
import React from 'react';
import type { GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import { Box, IconButton, Switch, Tooltip } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';

import type { Process } from './processApi.ts';
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
    onEditFieldClick: (row: Process, field: string, e: React.MouseEvent) => void;
    onRequestSave: (row: Process, field: string, newValue: string) => void;
    onCancelEdit: () => void;
    updateIsPending: boolean;
    onToggleActive: (row: Process) => void;
    toggleIsPending: boolean;
    onDeleteClick: (row: Process) => void;
    deleteIsPending: boolean;
}

export function useProcessColumns({
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
        field: keyof Process,
        headerKey: string,
        width: number,
        flex?: number,
    ): GridColDef {
        return {
            field: field as string,
            headerName: cfl(getString(headerKey)) || headerKey,
            width: flex ? undefined : width,
            flex,
            renderCell: (params: GridRenderCellParams<Process>) => {
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
        textEditCol('name', 'name', 220, 1),
        textEditCol('key', 'key', 180, 0.7),
        {
            field: 'is_active',
            headerName: cfl(getString('isActive')) || 'isActive',
            width: 120,
            sortable: false,
            renderCell: (params: GridRenderCellParams<Process>) => (
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
            renderCell: (params: GridRenderCellParams<Process>) =>
                formatToUkrDate(params.row.created_at),
        },
        {
            field: '_actions',
            headerName: '',
            width: 56,
            sortable: false,
            filterable: false,
            disableColumnMenu: true,
            renderCell: (params: GridRenderCellParams<Process>) => (
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

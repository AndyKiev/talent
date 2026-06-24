// src/components/admin/regions/useRegionColumns.tsx
import React from 'react';
import type { GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import { Box, IconButton, Switch, Tooltip } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';

import type { Region, MoveDirection } from './regionApi.ts';
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
    onEditFieldClick: (row: Region, field: string, e: React.MouseEvent) => void;
    onRequestSave: (row: Region, field: string, newValue: string) => void;
    onCancelEdit: () => void;
    updateIsPending: boolean;
    onToggleActive: (row: Region) => void;
    toggleIsPending: boolean;
    onDeleteClick: (row: Region) => void;
    deleteIsPending: boolean;
    rows: Region[];
    onMove: (row: Region, direction: MoveDirection) => void;
    moveIsPending: boolean;
}

export function useRegionColumns({
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
    rows,
    onMove,
    moveIsPending,
}: Params): GridColDef[] {

    function textEditCol(
        field: keyof Region,
        headerKey: string,
        width: number,
        flex?: number,
    ): GridColDef {
        return {
            field: field as string,
            headerName: cfl(getString(headerKey)) || headerKey,
            width: flex ? undefined : width,
            flex,
            renderCell: (params: GridRenderCellParams<Region>) => {
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

    const orderedIds = [...rows]
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((r) => r.id);

    return [
        textEditCol('name', 'name', 240, 1),
        textEditCol('key', 'key', 200, 0.8),
        {
            field: '_reorder',
            headerName: cfl(getString('order')) || 'Order',
            width: 96,
            sortable: false,
            filterable: false,
            disableColumnMenu: true,
            renderCell: (params: GridRenderCellParams<Region>) => {
                const idx = orderedIds.indexOf(params.row.id);
                const isFirst = idx <= 0;
                const isLast = idx === orderedIds.length - 1;
                return (
                    <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
                        <Tooltip title={getString('moveUp') || 'Move up'}>
                            <span>
                                <IconButton
                                    size="small"
                                    onClick={(e) => { e.stopPropagation(); onMove(params.row, 'up'); }}
                                    disabled={moveIsPending || isFirst}
                                >
                                    <ArrowUpwardIcon fontSize="small" />
                                </IconButton>
                            </span>
                        </Tooltip>
                        <Tooltip title={getString('moveDown') || 'Move down'}>
                            <span>
                                <IconButton
                                    size="small"
                                    onClick={(e) => { e.stopPropagation(); onMove(params.row, 'down'); }}
                                    disabled={moveIsPending || isLast}
                                >
                                    <ArrowDownwardIcon fontSize="small" />
                                </IconButton>
                            </span>
                        </Tooltip>
                    </Box>
                );
            },
        },
        {
            field: 'is_active',
            headerName: cfl(getString('isActive')) || 'Active',
            width: 120,
            sortable: false,
            renderCell: (params: GridRenderCellParams<Region>) => (
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
            renderCell: (params: GridRenderCellParams<Region>) =>
                formatToUkrDate(params.row.created_at),
        },
        {
            field: '_actions',
            headerName: '',
            width: 56,
            sortable: false,
            filterable: false,
            disableColumnMenu: true,
            renderCell: (params: GridRenderCellParams<Region>) => (
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

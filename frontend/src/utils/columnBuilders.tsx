// src/utils/columnBuilders.tsx
//
// Shared DataGrid column builders for the admin CRUD grids. Every useXColumns
// hook used to re-implement these; now each binds the factory once with its
// slice context and keeps its call sites (`textEditCol('name', 'name', 200, 1)`)
// unchanged. Renders the shared admin cells (TextEditCell / ReadonlyCell).
import React from 'react';
import type { GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import { Box, IconButton, Switch, Tooltip } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { TextEditCell } from '../components/admin/TextEditCell';
import { ReadonlyCell } from '../components/admin/ReadonlyCell';
import cfl from './helpers.ts';
import type { GetStringFn } from '../types/getStringFn';

/** Which row/field is currently in inline-edit mode (one at a time). */
export interface EditingState {
    userId: number | null;
    field: string | null;
}

export interface TextEditColContext<T extends { id: number }> {
    getString: GetStringFn;
    editingState: EditingState;
    onEditFieldClick: (row: T, field: string, e: React.MouseEvent) => void;
    onRequestSave: (row: T, field: string, newValue: string) => void;
    onCancelEdit: () => void;
    updateIsPending: boolean;
}

/** Bind once per grid; returns the classic textEditCol(field, headerKey, width, flex?). */
export function makeTextEditCol<T extends { id: number }>(ctx: TextEditColContext<T>) {
    const { getString, editingState, onEditFieldClick, onRequestSave, onCancelEdit, updateIsPending } = ctx;
    return function textEditCol(
        field: keyof T & string,
        headerKey: string,
        width: number,
        flex?: number,
    ): GridColDef {
        return {
            field,
            headerName: cfl(getString(headerKey)) || headerKey,
            width: flex ? undefined : width,
            flex,
            renderCell: (params: GridRenderCellParams<T>) => {
                const row = params.row;
                const isEditing = editingState.userId === row.id && editingState.field === field;
                return isEditing ? (
                    <TextEditCell
                        value={String(row[field] ?? '')}
                        onSave={(val) => onRequestSave(row, field, val)}
                        onCancel={onCancelEdit}
                        isPending={updateIsPending}
                    />
                ) : (
                    <ReadonlyCell
                        value={String(row[field] ?? '')}
                        onEdit={(e) => onEditFieldClick(row, field, e)}
                        editTitle={getString(`edit${cfl(field)}`) || `Edit ${field}`}
                        placeholder="—"
                    />
                );
            },
        };
    };
}

export interface DeleteColContext<T extends { id: number }> {
    getString: GetStringFn;
    onDeleteClick: (row: T) => void;
    deleteIsPending: boolean;
}

/**
 * The trailing delete-action column every admin CRUD grid ends with.
 *
 * Unlike makeTextEditCol / makeToggleCol this returns the column directly rather
 * than a bound builder — the column takes no per-call arguments, so there is
 * nothing left to bind.
 */
export function deleteActionCol<T extends { id: number }>(ctx: DeleteColContext<T>): GridColDef {
    const { getString, onDeleteClick, deleteIsPending } = ctx;
    return {
        field: '_actions',
        headerName: '',
        width: 56,
        sortable: false,
        filterable: false,
        disableColumnMenu: true,
        renderCell: (params: GridRenderCellParams<T>) => (
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
    };
}

export interface ToggleColContext {
    getString: GetStringFn;
    toggleIsPending: boolean;
}

/** Bind once per grid; returns toggleCol(field, headerKey, onToggle). */
export function makeToggleCol<T extends { id: number }>(ctx: ToggleColContext) {
    const { getString, toggleIsPending } = ctx;
    return function toggleCol(
        field: keyof T & string,
        headerKey: string,
        onToggle: (row: T) => void,
    ): GridColDef {
        return {
            field,
            headerName: cfl(getString(headerKey)) || headerKey,
            width: 120,
            sortable: false,
            renderCell: (params: GridRenderCellParams<T>) => (
                <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
                    <Switch
                        size="small"
                        checked={Boolean(params.row[field])}
                        onChange={() => onToggle(params.row)}
                        disabled={toggleIsPending}
                        onClick={(e) => e.stopPropagation()}
                    />
                </Box>
            ),
        };
    };
}

// src/components/training/employee_training_statuses/useEmployeeTrainingStatusColumns.tsx
import React from 'react';
import type { GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import { Box, IconButton, Tooltip } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';

import type { EmployeeTrainingStatus } from './employeeTrainingStatusApi.ts';
import cfl from '../../../utils/helpers.ts';
import type { GetStringFn } from '../../../types/getStringFn.ts';
import { TextEditCell } from '../../admin/TextEditCell.tsx';
import { ReadonlyCell } from '../../admin/ReadonlyCell.tsx';
import { formatToUkrDate } from '../../../utils/dateFormatter.ts';

export interface EditingState {
    userId: number | null;
    field: string | null;
}

interface Params {
    getString: GetStringFn;
    editingState: EditingState;
    onEditFieldClick: (row: EmployeeTrainingStatus, field: string, e: React.MouseEvent) => void;
    onRequestSave: (row: EmployeeTrainingStatus, field: string, newValue: string) => void;
    onCancelEdit: () => void;
    updateIsPending: boolean;
    onDeleteClick: (row: EmployeeTrainingStatus) => void;
    deleteIsPending: boolean;
}

export function useEmployeeTrainingStatusColumns({
    getString,
    editingState,
    onEditFieldClick,
    onRequestSave,
    onCancelEdit,
    updateIsPending,
    onDeleteClick,
    deleteIsPending,
}: Params): GridColDef[] {
    function textEditCol(
        field: keyof EmployeeTrainingStatus,
        headerKey: string,
        width: number,
        flex?: number,
    ): GridColDef {
        return {
            field: field as string,
            headerName: cfl(getString(headerKey)) || headerKey,
            width: flex ? undefined : width,
            flex,
            renderCell: (params: GridRenderCellParams<EmployeeTrainingStatus>) => {
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

    return [
        textEditCol('key', 'key', 200, 0.8),
        textEditCol('description', 'description', 280, 1.2),
        {
            field: 'created_at',
            headerName: getString('createdAt'),
            width: 160,
            renderCell: (params: GridRenderCellParams<EmployeeTrainingStatus>) =>
                formatToUkrDate(params.row.created_at),
        },
        {
            field: '_actions',
            headerName: '',
            width: 56,
            sortable: false,
            filterable: false,
            disableColumnMenu: true,
            renderCell: (params: GridRenderCellParams<EmployeeTrainingStatus>) => (
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

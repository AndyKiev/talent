// src/components/training/training_categories/useTrainingCategoryColumns.tsx
import React from 'react';
import type { GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import { Box, IconButton, Tooltip } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';

import type { TrainingCategory } from './trainingCategoryApi.ts';
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
    onEditFieldClick: (row: TrainingCategory, field: string, e: React.MouseEvent) => void;
    onRequestSave: (row: TrainingCategory, field: string, newValue: string) => void;
    onCancelEdit: () => void;
    updateIsPending: boolean;
    onDeleteClick: (row: TrainingCategory) => void;
    deleteIsPending: boolean;
}

export function useTrainingCategoryColumns({
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
        field: keyof TrainingCategory,
        headerKey: string,
        width: number,
        flex?: number,
    ): GridColDef {
        return {
            field: field as string,
            headerName: cfl(getString(headerKey)) || headerKey,
            width: flex ? undefined : width,
            flex,
            renderCell: (params: GridRenderCellParams<TrainingCategory>) => {
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
        textEditCol('name', 'name', 200, 1),
        textEditCol('key', 'key', 160, 0.7),
        textEditCol('description', 'description', 240, 1),
        {
            field: 'created_at',
            headerName: getString('createdAt'),
            width: 160,
            renderCell: (params: GridRenderCellParams<TrainingCategory>) =>
                formatToUkrDate(params.row.created_at),
        },
        {
            field: '_actions',
            headerName: '',
            width: 56,
            sortable: false,
            filterable: false,
            disableColumnMenu: true,
            renderCell: (params: GridRenderCellParams<TrainingCategory>) => (
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

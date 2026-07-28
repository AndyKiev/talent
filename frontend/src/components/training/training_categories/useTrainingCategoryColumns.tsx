// src/components/training/training_categories/useTrainingCategoryColumns.tsx
import React from 'react';
import type { GridColDef, GridRenderCellParams } from '@mui/x-data-grid';

import type { TrainingCategory } from './trainingCategoryApi.ts';
import type { GetStringFn } from '../../../types/getStringFn.ts';
import { formatToUkrDate } from '../../../utils/dateFormatter.ts';
import { makeTextEditCol, deleteActionCol, type EditingState } from '../../../utils/columnBuilders';
export type { EditingState };

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
    const textEditCol = makeTextEditCol<TrainingCategory>({
        getString, editingState, onEditFieldClick, onRequestSave, onCancelEdit, updateIsPending,
    });

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
        deleteActionCol<TrainingCategory>({ getString, onDeleteClick, deleteIsPending }),
    ];
}

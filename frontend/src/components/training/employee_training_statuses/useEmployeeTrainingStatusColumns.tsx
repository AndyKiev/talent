// src/components/training/employee_training_statuses/useEmployeeTrainingStatusColumns.tsx
import React from 'react';
import type { GridColDef, GridRenderCellParams } from '@mui/x-data-grid';

import type { EmployeeTrainingStatus } from './employeeTrainingStatusApi.ts';
import type { GetStringFn } from '../../../types/getStringFn.ts';
import { formatToUkrDate } from '../../../utils/dateFormatter.ts';
import { makeTextEditCol, deleteActionCol, type EditingState } from '../../../utils/columnBuilders';
export type { EditingState };

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
    const textEditCol = makeTextEditCol<EmployeeTrainingStatus>({
        getString, editingState, onEditFieldClick, onRequestSave, onCancelEdit, updateIsPending,
    });

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
        deleteActionCol<EmployeeTrainingStatus>({ getString, onDeleteClick, deleteIsPending }),
    ];
}

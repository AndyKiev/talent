// src/components/admin/job_categories/useJobCategoryColumns.tsx
import React from 'react';
import type { GridColDef, GridRenderCellParams } from '@mui/x-data-grid';

import type { JobCategory } from './jobCategoryApi.ts';
import cfl, { snakeToCamel } from '../../../utils/helpers.ts';
import type { GetStringFn } from '../../../types/getStringFn.ts';
import { TextEditCell } from '../TextEditCell.tsx';
import { ReadonlyCell } from '../ReadonlyCell.tsx';
import { formatToUkrDate } from '../../../utils/dateFormatter.ts';
import { deleteActionCol } from '../../../utils/columnBuilders';

export interface EditingState {
    rowId: number | null;
    field: string | null;
}

interface Params {
    getString: GetStringFn;
    editingState: EditingState;
    onEditFieldClick: (row: JobCategory, field: string, e: React.MouseEvent) => void;
    onRequestSave: (row: JobCategory, field: string, newValue: string) => void;
    onCancelEdit: () => void;
    updateIsPending: boolean;
    onDeleteClick: (row: JobCategory) => void;
    deleteIsPending: boolean;
    orderColumn?: GridColDef;
}

export function useJobCategoryColumns({
    getString,
    editingState,
    onEditFieldClick,
    onRequestSave,
    onCancelEdit,
    updateIsPending,
    onDeleteClick,
    deleteIsPending,
    orderColumn,
}: Params): GridColDef[] {

    function textEditCol(
        field: keyof JobCategory,
        headerKey: string,
        width: number,
        flex?: number,
    ): GridColDef {
        return {
            field: field as string,
            headerName: cfl(getString(headerKey)) || headerKey,
            width: flex ? undefined : width,
            flex,
            renderCell: (params: GridRenderCellParams<JobCategory>) => {
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
                        editTitle={getString(`edit${cfl(field)}`) || `Edit ${field}`}
                        placeholder="—"
                    />
                );
            },
        };
    }

    return [
        ...(orderColumn ? [orderColumn] : []),
        // Translated label — derived from the snake_case key (read-only).
        {
            field: 'label',
            headerName: cfl(getString('label')) || 'Label',
            width: 180,
            sortable: false,
            renderCell: (params: GridRenderCellParams<JobCategory>) =>
                cfl(getString(snakeToCamel(params.row.key))) || params.row.key,
        },
        textEditCol('key', 'key', 160, 0.7),
        textEditCol('description', 'description', 260, 1),
        {
            field: 'created_at',
            headerName: cfl(getString('createdAt')) || 'Created',
            width: 160,
            renderCell: (params: GridRenderCellParams<JobCategory>) =>
                formatToUkrDate(params.row.created_at),
        },
        deleteActionCol<JobCategory>({ getString, onDeleteClick, deleteIsPending }),
    ];
}

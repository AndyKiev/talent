// src/components/admin/employee_events/employee_event_statuses/useEmployeeEventStatusColumns.tsx
import React from 'react';
import type { GridColDef, GridRenderCellParams } from '@mui/x-data-grid';

import type { EmployeeEventStatus } from './employeeEventStatusApi';
import type { GetStringFn } from '../../../../types/getStringFn';
import { TextEditCell } from '../../TextEditCell';
import { ReadonlyCell } from '../../ReadonlyCell';
import cfl from '../../../../utils/helpers.ts';
import { deleteActionCol } from '../../../../utils/columnBuilders';

export interface EditingState {
  rowId: number | null;
  field: string | null;
}

interface Params {
  getString: GetStringFn;
  editingState: EditingState;
  onEditFieldClick: (row: EmployeeEventStatus, field: string, e: React.MouseEvent) => void;
  onRequestSave: (row: EmployeeEventStatus, field: string, newValue: string) => void;
  onCancelEdit: () => void;
  updateIsPending: boolean;
  onDeleteClick: (row: EmployeeEventStatus) => void;
  deleteIsPending: boolean;
}

export function useEmployeeEventStatusColumns({
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
    field: keyof EmployeeEventStatus,
    headerKey: string,
    width: number,
    flex?: number,
  ): GridColDef {
    return {
      field: field as string,
      headerName: cfl(getString(headerKey)) || headerKey,
      width: flex ? undefined : width,
      flex,
      renderCell: (params: GridRenderCellParams<EmployeeEventStatus>) => {
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
    textEditCol('name', 'name', 200, 1),
    textEditCol('description', 'description', 300, 2),
    deleteActionCol<EmployeeEventStatus>({ getString, onDeleteClick, deleteIsPending }),
  ];
}

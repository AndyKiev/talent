// src/components/admin/operations/useOperationColumns.tsx
import React from 'react';
import type { GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import { Box, IconButton, Tooltip } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import type { Operation } from './operationApi';
import { TextEditCell } from '../TextEditCell';
import { ReadonlyCell } from '../ReadonlyCell';
import type { GetStringFn } from '../../../types/getStringFn';
import cfl from '../../../utils/helpers.ts';

export interface EditingState {
  rowId: number | null;
  field: string | null;
}

interface Params {
  getString: GetStringFn;
  editingState: EditingState;
  onEditFieldClick: (row: Operation, field: string, e: React.MouseEvent) => void;
  /** Called by TextEditCell ✓ — fires the update mutation directly (no confirm dialog) */
  onSave: (row: Operation, field: string, newValue: string) => void;
  onCancelEdit: () => void;
  updateIsPending: boolean;
  onDeleteClick: (row: Operation) => void;
  deleteIsPending: boolean;
}

export function useOperationColumns({
  getString,
  editingState,
  onEditFieldClick,
  onSave,
  onCancelEdit,
  updateIsPending,
  onDeleteClick,
  deleteIsPending,
}: Params): GridColDef[] {
  const textCol = (field: keyof Operation, headerKey: string, flex = 1): GridColDef => ({
    field: field as string,
    headerName: cfl(getString(headerKey)) || headerKey,
    flex,
    renderCell: (params: GridRenderCellParams<Operation>) => {
      const row = params.row;
      const isEditing = editingState.rowId === row.id && editingState.field === field;
      // Cast through unknown to satisfy TS — field is always a valid key of Operation here
      const value = String((row as unknown as Record<string, unknown>)[field as string] ?? '');
      return isEditing ? (
        <TextEditCell
          value={value}
          onSave={(v) => onSave(row, field as string, v)}
          onCancel={onCancelEdit}
          isPending={updateIsPending}
        />
      ) : (
        <ReadonlyCell
          value={value}
          onEdit={(e) => onEditFieldClick(row, field as string, e)}
          editTitle={getString(`edit_${field as string}`) || `Edit ${field as string}`}
          placeholder="—"
        />
      );
    },
  });

  return [
    textCol('name', 'name'),
    textCol('description', 'description'),
    {
      field: '_actions',
      headerName: '',
      width: 56,
      sortable: false,
      filterable: false,
      disableColumnMenu: true,
      renderCell: (params: GridRenderCellParams<Operation>) => (
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

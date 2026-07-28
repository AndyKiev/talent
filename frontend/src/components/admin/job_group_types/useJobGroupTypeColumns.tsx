// src/components/admin/job_group_types/useJobGroupTypeColumns.tsx
import React from 'react';
import type { GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import { Box, Chip, Switch, Tooltip } from '@mui/material';
import { deleteActionCol } from '../../../utils/columnBuilders';

import type { JobGroupType } from './jobGroupTypeApi';
import type { GetStringFn } from '../../../types/getStringFn';
import { TextEditCell } from '../TextEditCell';
import { ReadonlyCell } from '../ReadonlyCell';
import cfl, {snakeToCamel} from '../../../utils/helpers.ts';

export interface EditingState {
  rowId: number | null;
  field: string | null;
}

interface Params {
  getString: GetStringFn;
  editingState: EditingState;
  onEditFieldClick: (row: JobGroupType, field: string, e: React.MouseEvent) => void;
  onRequestSave: (row: JobGroupType, field: string, newValue: string) => void;
  onCancelEdit: () => void;
  updateIsPending: boolean;
  onToggleAllowMultiple: (row: JobGroupType) => void;
  toggleIsPending: boolean;
  onDeleteClick: (row: JobGroupType) => void;
  deleteIsPending: boolean;
}

export function useJobGroupTypeColumns({
  getString,
  editingState,
  onEditFieldClick,
  onRequestSave,
  onCancelEdit,
  updateIsPending,
  onToggleAllowMultiple,
  toggleIsPending,
  onDeleteClick,
  deleteIsPending,
}: Params): GridColDef[] {
  function textEditCol(
    field: keyof JobGroupType,
    headerKey: string,
    width: number,
    flex?: number,
  ): GridColDef {
    return {
      field: field as string,
      headerName: cfl(getString(headerKey)) || headerKey,
      width: flex ? undefined : width,
      flex,
      renderCell: (params: GridRenderCellParams<JobGroupType>) => {
        const row = params.row;
        const isEditing = editingState.rowId === row.id && editingState.field === field;
        const value = String((row as unknown as Record<string, unknown>)[field] ?? '');
        return isEditing ? (
          <TextEditCell
            value={value}
            onSave={(val) => onRequestSave(row, field as string, val)}
            onCancel={onCancelEdit}
            isPending={updateIsPending}
          />
        ) : (
          <ReadonlyCell
            value={value}
            onEdit={(e) => onEditFieldClick(row, field as string, e)}
            // editTitle={getString(`edit_${field}`) || `Edit ${field}`}
            editTitle={`${getString("edit")} + ' ' + ${getString(snakeToCamel(field))}`}
            placeholder="—"
          />
        );
      },
    };
  }

  return [
    textEditCol('name', 'name', 200, 1),

    textEditCol('key', 'key', 160),

    textEditCol('description', 'description', 240, 1),

    {
      field: 'allow_multiple',
      headerName: cfl(getString('allowMultiple')) || 'Allow Multiple',
      width: 150,
      sortable: false,
      renderCell: (params: GridRenderCellParams<JobGroupType>) => {
        const row = params.row;
        return (
          <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
            <Tooltip
              title={
                row.allow_multiple
                  ? getString('allowMultipleHint') || 'A job may belong to multiple groups of this type'
                  : getString('singletonHint') || 'A job may only belong to one group of this type'
              }
            >
              <span>
                <Switch
                  size="small"
                  checked={row.allow_multiple}
                  onChange={() => onToggleAllowMultiple(row)}
                  disabled={toggleIsPending}
                  onClick={(e) => e.stopPropagation()}
                />
              </span>
            </Tooltip>
          </Box>
        );
      },
    },

    {
      field: 'groups',
      headerName: cfl(getString('groups')) || 'Groups',
      width: 200,
      sortable: false,
      renderCell: (params: GridRenderCellParams<JobGroupType>) => {
        const groups: string[] = params.row.groups ?? [];
        return (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, py: 0.5, alignItems: 'center' }}>
            {groups.length === 0 ? (
              <Chip label={getString('none') || 'None'} size="small" variant="outlined" color="default" />
            ) : (
              groups.map((g) => (
                <Chip key={g} label={g} size="small" variant="outlined" color="primary" />
              ))
            )}
          </Box>
        );
      },
    },

    deleteActionCol<JobGroupType>({ getString, onDeleteClick, deleteIsPending }),
  ];
}

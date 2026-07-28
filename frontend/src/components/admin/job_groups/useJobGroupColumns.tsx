// src/components/admin/job_groups/useJobGroupColumns.tsx
import React from 'react';
import type { GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import { Box, Chip, Tooltip } from '@mui/material';

import type { JobGroup } from './jobGroupApi';
import type { JobGroupType } from '../job_group_types/jobGroupTypeApi';
import type { GetStringFn } from '../../../types/getStringFn';
import { TextEditCell } from '../TextEditCell';
import { ReadonlyCell } from '../ReadonlyCell';
import cfl, {snakeToCamel} from '../../../utils/helpers.ts';
import { deleteActionCol } from '../../../utils/columnBuilders';

export interface EditingState {
  rowId: number | null;
  field: string | null;
}

interface Params {
  getString: GetStringFn;
  groupTypes: JobGroupType[];
  editingState: EditingState;
  onEditFieldClick: (row: JobGroup, field: string, e: React.MouseEvent) => void;
  onRequestSave: (row: JobGroup, field: string, newValue: string) => void;
  onCancelEdit: () => void;
  updateIsPending: boolean;
  onEditTypeClick: (row: JobGroup) => void;
  onDeleteClick: (row: JobGroup) => void;
  deleteIsPending: boolean;
}

export function useJobGroupColumns({
  getString,
  groupTypes,
  editingState,
  onEditFieldClick,
  onRequestSave,
  onCancelEdit,
  updateIsPending,
  onEditTypeClick,
  onDeleteClick,
  deleteIsPending,
}: Params): GridColDef[] {
  function textEditCol(
    field: keyof JobGroup,
    headerKey: string,
    width: number,
    flex?: number,
  ): GridColDef {
    return {
      field: field as string,
      headerName: cfl(getString(headerKey)) || headerKey,
      width: flex ? undefined : width,
      flex,
      renderCell: (params: GridRenderCellParams<JobGroup>) => {
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
            editTitle={`${getString("edit")} ${getString(snakeToCamel(field))}`}
            placeholder="—"
          />
        );
      },
    };
  }

  return [
    textEditCol('name', 'name', 200, 1),

    textEditCol('key', 'key', 140),

    textEditCol('description', 'description', 240, 1),

    {
      field: 'job_group_type_id',
      headerName: cfl(getString('groupType')) || 'Type',
      width: 180,
      renderCell: (params: GridRenderCellParams<JobGroup>) => {
        const row = params.row;
        // Use denormalised name if available, fall back to lookup
        const typeName =
          row.job_group_type_name ??
          groupTypes.find((t) => t.id === row.job_group_type_id)?.name ??
          String(row.job_group_type_id);
        const allowMultiple =
          row.allow_multiple ??
          groupTypes.find((t) => t.id === row.job_group_type_id)?.allow_multiple;
        return (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, height: '100%' }}>
            <Chip
              label={typeName}
              size="small"
              variant="outlined"
              color="info"
              onClick={() => onEditTypeClick(row)}
              sx={{ cursor: 'pointer' }}
            />
            {allowMultiple === false && (
              <Tooltip title={getString('singletonHint') || 'Singleton type — one group per job'}>
                <Chip label="1" size="small" color="warning" variant="outlined" />
              </Tooltip>
            )}
          </Box>
        );
      },
    },

    deleteActionCol<JobGroup>({ getString, onDeleteClick, deleteIsPending }),
  ];
}

// src/components/admin/talent-statuses/useTalentStatusColumns.tsx
import React from 'react';
import type { GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import {
  Box,
  // Chip,
  Switch } from '@mui/material';

import type {TalentStatus} from "./talentStatusApi.ts";
import cfl from "../../../utils/helpers.ts";
import type {GetStringFn} from "../../../types/getStringFn.ts";
import {TextEditCell} from "../TextEditCell.tsx";
import {ReadonlyCell} from "../ReadonlyCell.tsx";
import {formatToUkrDate} from "../../../utils/dateFormatter.ts";
import { makeTextEditCol, deleteActionCol, type EditingState } from '../../../utils/columnBuilders';

interface Params {
  getString: GetStringFn;

  editingState: EditingState;
  onEditFieldClick: (row: TalentStatus, field: string, e: React.MouseEvent) => void;
  /** Called by TextEditCell ✓ — triggers the confirmation dialog (does NOT save immediately) */
  onRequestSave: (row: TalentStatus, field: string, newValue: string) => void;
  onCancelEdit: () => void;
  updateIsPending: boolean;

  onToggleActive: (row: TalentStatus) => void;
  toggleIsPending: boolean;

  onDeleteClick: (row: TalentStatus) => void;
  deleteIsPending: boolean;
}

export function useTalentStatusColumns({
  getString,
  editingState,
  onEditFieldClick,
  onRequestSave,
  onCancelEdit,
  updateIsPending,
  onToggleActive,
  toggleIsPending,
  onDeleteClick,
  deleteIsPending,
}: Params): GridColDef[] {

    const textEditCol = makeTextEditCol<TalentStatus>({
        getString, editingState, onEditFieldClick, onRequestSave, onCancelEdit, updateIsPending,
    });

  return [
    {
      field: 'key',
      headerName: cfl(getString('key')) || 'Key',
      width: 100,
      renderCell: (params: GridRenderCellParams<TalentStatus>) => {
        const row = params.row;
        const isEditing = editingState.userId === row.id && editingState.field === 'key';
        return isEditing ? (
          <TextEditCell
            value={row.key}
            onSave={(val) => onRequestSave(row, 'key', val)}
            onCancel={onCancelEdit}
            isPending={updateIsPending}
          />
        ) : (
          <ReadonlyCell
            value={row.key}
            onEdit={(e) => onEditFieldClick(row, 'key', e)}
            editTitle={getString('editKey') || 'Edit key'}
          />
        );
      },
    },

    textEditCol('name', 'name', 200, 1),

    textEditCol('description', 'description', 240, 1),

    {
      field: 'is_active',
      headerName: cfl(getString('isActive')) || 'Active',
      width: 120,
      sortable: false,
      renderCell: (params: GridRenderCellParams<TalentStatus>) => {
        const row = params.row;
        return (
          <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
            <Switch
              size="small"
              checked={row.is_active}
              onChange={() => onToggleActive(row)}
              disabled={toggleIsPending}
              onClick={(e) => e.stopPropagation()}
            />
          </Box>
        );
      },
    },
    // //
    // {
    //   field: 'created_at',
    //   headerName: getString('createdAt') ,
    //   width: 160,
    //   renderCell: (params: GridRenderCellParams<TalentStatus>) => (
    //     <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
    //       <Chip
    //         label={formatToUkrDate(params.row.created_at)}
    //         size="small"
    //         variant="outlined"
    //       />
    //     </Box>
    //   ),
    // },
    {
      field: 'created_at',
      headerName: getString('createdAt'),
      width: 160,
      renderCell: (params: GridRenderCellParams<TalentStatus>) =>
          formatToUkrDate(params.row.created_at),
    },
    deleteActionCol<TalentStatus>({ getString, onDeleteClick, deleteIsPending }),
  ];
}

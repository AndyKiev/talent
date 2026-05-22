// src/components/admin/jobs/useJobColumns.tsx
import React from 'react';
import type { GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import { Box, Chip, IconButton, Switch, Tooltip } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import GroupsIcon from '@mui/icons-material/Groups';

import type { Job } from './jobApi';
import type { GetStringFn } from '../../../types/getStringFn';
import { TextEditCell } from '../TextEditCell';
import { ReadonlyCell } from '../ReadonlyCell';
import { formatToUkrDate } from '../../../utils/dateFormatter';
import cfl from '../../../utils/capitalizeFirstLetter';

export interface EditingState {
  rowId: number | null;
  field: string | null;
}

interface Params {
  getString: GetStringFn;
  editingState: EditingState;
  onEditFieldClick: (row: Job, field: string, e: React.MouseEvent) => void;
  onRequestSave: (row: Job, field: string, newValue: string) => void;
  onCancelEdit: () => void;
  updateIsPending: boolean;
  onToggleActive: (row: Job) => void;
  toggleIsPending: boolean;
  onGroupsClick: (row: Job) => void;
  onDeleteClick: (row: Job) => void;
  deleteIsPending: boolean;
}

export function useJobColumns({
  getString,
  editingState,
  onEditFieldClick,
  onRequestSave,
  onCancelEdit,
  updateIsPending,
  onToggleActive,
  toggleIsPending,
  onGroupsClick,
  onDeleteClick,
  deleteIsPending,
}: Params): GridColDef[] {
  function textEditCol(
    field: keyof Job,
    headerKey: string,
    width: number,
    flex?: number,
  ): GridColDef {
    return {
      field: field as string,
      headerName: cfl(getString(headerKey)) || headerKey,
      width: flex ? undefined : width,
      flex,
      renderCell: (params: GridRenderCellParams<Job>) => {
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
            editTitle={getString(`edit_${field}`) || `Edit ${field}`}
            placeholder="—"
          />
        );
      },
    };
  }

  return [
    textEditCol('name', 'name', 200, 1),

    textEditCol('description', 'description', 260, 1),

    {
      field: 'groups',
      headerName: cfl(getString('groups')) || 'Groups',
      width: 220,
      sortable: false,
      renderCell: (params: GridRenderCellParams<Job>) => {
        const row = params.row;
        const groups: string[] = row.groups ?? [];
        return (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
              flexWrap: 'wrap',
              py: 0.5,
              cursor: 'pointer',
            }}
            onClick={() => onGroupsClick(row)}
          >
            {groups.length === 0 ? (
              <Chip
                label={getString('noGroups') || 'No groups'}
                size="small"
                variant="outlined"
                color="default"
                icon={<GroupsIcon />}
                onClick={() => onGroupsClick(row)}
              />
            ) : (
              groups.map((g) => (
                <Chip key={g} label={g} size="small" variant="outlined" color="primary" />
              ))
            )}
          </Box>
        );
      },
    },

    {
      field: 'is_active',
      headerName: cfl(getString('isActive')) || 'Active',
      width: 110,
      sortable: true,
      renderCell: (params: GridRenderCellParams<Job>) => {
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

    {
      field: 'created_at',
      headerName: cfl(getString('createdAt')) || 'Created',
      width: 160,
      renderCell: (params: GridRenderCellParams<Job>) =>
        formatToUkrDate(params.row.created_at),
    },

    {
      field: '_actions',
      headerName: '',
      width: 56,
      sortable: false,
      filterable: false,
      disableColumnMenu: true,
      renderCell: (params: GridRenderCellParams<Job>) => (
        <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
          <Tooltip title={getString('delete') || 'Delete'}>
            <span>
              <IconButton
                size="small"
                color="error"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteClick(params.row);
                }}
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

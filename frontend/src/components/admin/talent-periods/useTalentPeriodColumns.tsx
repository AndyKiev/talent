// src/components/admin/talent-periods/useTalentPeriodColumns.tsx
import React from 'react';
import type { GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import {
    Box,
    // Chip,
    IconButton,
    Switch,
    Tooltip,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';

import type { TalentPeriod } from "./talentPeriodApi.ts";
import cfl from "../../../utils/capitalizeFirstLetter.ts";
import type { GetStringFn } from "../../../types/getStringFn.ts";
import { TextEditCell } from "../TextEditCell.tsx";
import { ReadonlyCell } from "../ReadonlyCell.tsx";
import {formatToUkrDate} from "../../../utils/dateFormatter.ts";
export interface EditingState {
    userId: number | null;
    field: string | null;
}

interface Params {
    getString: GetStringFn;

    editingState: EditingState;
    onEditFieldClick: (row: TalentPeriod, field: string, e: React.MouseEvent) => void;
    /** Called by TextEditCell ✓ — triggers the confirmation dialog (does NOT save immediately) */
    onRequestSave: (row: TalentPeriod, field: string, newValue: string) => void;
    onCancelEdit: () => void;
    updateIsPending: boolean;

    onToggleActive: (row: TalentPeriod) => void;
    toggleIsPending: boolean;

    onDeleteClick: (row: TalentPeriod) => void;
    deleteIsPending: boolean;
}

export function useTalentPeriodColumns({
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

    function textEditCol(
        field: keyof TalentPeriod,
        headerKey: string,
        width: number,
        flex?: number,
    ): GridColDef {
        return {
            field: field as string,
            headerName: cfl(getString(headerKey)) || headerKey,
            width: flex ? undefined : width,
            flex,
            renderCell: (params: GridRenderCellParams<TalentPeriod>) => {
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
                        editTitle={getString(`edit_${field}`) || `Edit ${field}`}
                        placeholder="—"
                    />
                );
            },
        };
    }

    return [
        textEditCol('name', 'name', 200, 1),

        textEditCol('description', 'description', 240, 1),

        {
            field: 'is_active',
            headerName: cfl(getString('isActive')) || 'Active',
            width: 120,
            sortable: false,
            renderCell: (params: GridRenderCellParams<TalentPeriod>) => {
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
            headerName: getString('createdAt'),
            width: 160,
            renderCell: (params: GridRenderCellParams<TalentPeriod>) =>
                formatToUkrDate(params.row.created_at),
        },
        // {
        //     field: 'created_at',
        //     headerName: getString('createdAt'),
        //     width: 160,
        //     renderCell: (params: GridRenderCellParams<TalentPeriod>) => (
        //         <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
        //             <Chip
        //                 label={new Date(params.row.created_at).toLocaleDateString()}
        //                 size="small"
        //                 variant="outlined"
        //             />
        //         </Box>
        //     ),
        // },

        {
            field: '_actions',
            headerName: '',
            width: 56,
            sortable: false,
            filterable: false,
            disableColumnMenu: true,
            renderCell: (params: GridRenderCellParams<TalentPeriod>) => (
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
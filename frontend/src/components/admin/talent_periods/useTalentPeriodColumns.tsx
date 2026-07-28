// src/components/admin/talent-periods/useTalentPeriodColumns.tsx
import React from 'react';
import type { GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import {
    Box,
    Switch,
} from '@mui/material';

import type { TalentPeriod } from "./talentPeriodApi.ts";
import cfl from "../../../utils/helpers.ts";
import type { GetStringFn } from "../../../types/getStringFn.ts";
import { TextEditCell } from "../TextEditCell.tsx";
import { ReadonlyCell } from "../ReadonlyCell.tsx";
import { formatToUkrDate } from "../../../utils/dateFormatter.ts";
import { makeTextEditCol, deleteActionCol, type EditingState } from '../../../utils/columnBuilders';
export type { EditingState };

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

    const textEditCol = makeTextEditCol<TalentPeriod>({
        getString, editingState, onEditFieldClick, onRequestSave, onCancelEdit, updateIsPending,
    });

    function numberEditCol(
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
                        onSave={(val) => {
                            // Validate number before saving
                            const numValue = Number(val);
                            if (field === 'qty_months') {
                                if (isNaN(numValue) || numValue < 1 || numValue > 120) {
                                    // Show error to user
                                    alert(getString('qtyMonthsInvalid') || 'Duration must be between 1 and 120 months');
                                    return;
                                }
                                onRequestSave(row, field as string, String(numValue));
                            } else {
                                onRequestSave(row, field as string, val);
                            }
                        }}
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
        numberEditCol('qty_months', 'qtyMonths', 140, 0.5), // Added qty_months column
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
        deleteActionCol<TalentPeriod>({ getString, onDeleteClick, deleteIsPending }),
    ];
}

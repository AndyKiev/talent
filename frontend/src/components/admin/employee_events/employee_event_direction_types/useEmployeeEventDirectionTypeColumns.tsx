// src/components/admin/employee_events/employee_event_direction_types/useEmployeeEventDirectionTypeColumns.tsx
import React from 'react';
import type { GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import { Typography } from '@mui/material';

import type { EmployeeEventDirectionType } from './employeeEventDirectionTypeApi.ts';
import cfl from '../../../../utils/helpers.ts';
import type { GetStringFn } from '../../../../types/getStringFn.ts';
import { TextEditCell } from '../../TextEditCell.tsx';
import { ReadonlyCell } from '../../ReadonlyCell.tsx';
import { deleteActionCol } from '../../../../utils/columnBuilders';

export interface EditingState {
    rowId: number | null;
    field: string | null;
}

interface Params {
    getString: GetStringFn;
    editingState: EditingState;
    onEditFieldClick: (row: EmployeeEventDirectionType, field: string, e: React.MouseEvent) => void;
    onRequestSave: (row: EmployeeEventDirectionType, field: string, newValue: string) => void;
    onCancelEdit: () => void;
    updateIsPending: boolean;
    onDeleteClick: (row: EmployeeEventDirectionType) => void;
    deleteIsPending: boolean;
}

export function useEmployeeEventDirectionTypeColumns({
                                                         getString,
                                                         editingState,
                                                         onEditFieldClick,
                                                         onRequestSave,
                                                         onCancelEdit,
                                                         updateIsPending,
                                                         onDeleteClick,
                                                         deleteIsPending,
                                                     }: Params): GridColDef[] {
    return [
        {
            // code is seeded / unique — never editable after creation
            field: 'code',
            headerName: cfl(getString('code')) || 'Code',
            width: 220,
            renderCell: (params: GridRenderCellParams<EmployeeEventDirectionType>) => (
                <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                    {params.row.code || '—'}
                </Typography>
            ),
        },
        {
            // name is the only patchable field
            field: 'name',
            headerName: cfl(getString('name')) || 'Name',
            flex: 1,
            renderCell: (params: GridRenderCellParams<EmployeeEventDirectionType>) => {
                const row = params.row;
                const isEditing = editingState.rowId === row.id && editingState.field === 'name';
                return isEditing ? (
                    <TextEditCell
                        value={row.name}
                        onSave={(val) => onRequestSave(row, 'name', val)}
                        onCancel={onCancelEdit}
                        isPending={updateIsPending}
                    />
                ) : (
                    <ReadonlyCell
                        value={row.name}
                        onEdit={(e) => onEditFieldClick(row, 'name', e)}
                        editTitle={getString('edit_name') || 'Edit name'}
                        placeholder="—"
                    />
                );
            },
        },
        deleteActionCol<EmployeeEventDirectionType>({ getString, onDeleteClick, deleteIsPending }),
    ];
}

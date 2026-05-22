// src/components/admin/user-group-types/useUserGroupTypeColumns.tsx
import React from 'react';
import type { GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import { Box, IconButton, Tooltip, Chip } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import type { UserGroupType } from "./userGroupTypeApi";
import cfl from "../../../utils/capitalizeFirstLetter";
import type { GetStringFn } from "../../../types/getStringFn";
import { TextEditCell } from "../TextEditCell";
import { ReadonlyCell } from "../ReadonlyCell";
import { formatToUkrDate } from "../../../utils/dateFormatter";

export interface EditingState {
    id: number | null;
    field: string | null;
}

interface Params {
    getString: GetStringFn;
    editingState: EditingState;
    onEditFieldClick: (row: UserGroupType, field: string, e: React.MouseEvent) => void;
    onRequestSave: (row: UserGroupType, field: string, newValue: string) => void;
    onCancelEdit: () => void;
    updateIsPending: boolean;
    onDeleteClick: (row: UserGroupType) => void;
    deleteIsPending: boolean;
}

export function useUserGroupTypeColumns({
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
            field: 'name',
            headerName: cfl(getString('name')) || 'Name',
            width: 200,
            renderCell: (params: GridRenderCellParams<UserGroupType>) => {
                const row = params.row;
                const isEditing = editingState.id === row.id && editingState.field === 'name';
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
                        editTitle={getString('editName') || 'Edit name'}
                    />
                );
            },
        },
        {
            field: 'description',
            headerName: cfl(getString('description')) || 'Description',
            width: 250,
            flex: 1,
            renderCell: (params: GridRenderCellParams<UserGroupType>) => {
                const row = params.row;
                const isEditing = editingState.id === row.id && editingState.field === 'description';
                return isEditing ? (
                    <TextEditCell
                        value={row.description ?? ''}
                        onSave={(val) => onRequestSave(row, 'description', val)}
                        onCancel={onCancelEdit}
                        isPending={updateIsPending}
                    />
                ) : (
                    <ReadonlyCell
                        value={row.description ?? ''}
                        onEdit={(e) => onEditFieldClick(row, 'description', e)}
                        editTitle={getString('editDescription') || 'Edit description'}
                        placeholder="—"
                    />
                );
            },
        },
        {
            field: 'groups',
            headerName: cfl(getString('linkedGroups')) || 'Linked Groups',
            width: 200,
            renderCell: (params: GridRenderCellParams<UserGroupType>) => {
                const groups = params.row.groups || [];
                if (groups.length === 0) {
                    return <Box sx={{ color: 'text.disabled' }}>—</Box>;
                }
                return (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {groups.slice(0, 3).map((groupName, idx) => (
                            <Chip key={idx} label={groupName} size="small" variant="outlined" />
                        ))}
                        {groups.length > 3 && (
                            <Chip label={`+${groups.length - 3}`} size="small" />
                        )}
                    </Box>
                );
            },
        },
        {
            field: 'created_at',
            headerName: getString('createdAt'),
            width: 160,
            renderCell: (params: GridRenderCellParams<UserGroupType>) =>
                formatToUkrDate(params.row.created_at),
        },
        {
            field: '_actions',
            headerName: '',
            width: 56,
            sortable: false,
            filterable: false,
            disableColumnMenu: true,
            renderCell: (params: GridRenderCellParams<UserGroupType>) => (
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
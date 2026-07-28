// src/components/admin/user_groups/useUserGroupColumns.tsx
import React from 'react';
import type { GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import { Box, Chip, IconButton, Switch, Tooltip } from '@mui/material';
import LockIcon from '@mui/icons-material/Lock';
import KeyIcon from '@mui/icons-material/Key';

import type { UserGroup } from './userGroupApi';
import type { UserGroupType } from '../user_group_types/userGroupTypeApi';
import type { GetStringFn } from '../../../types/getStringFn';
import { TextEditCell } from '../TextEditCell';
import { ReadonlyCell } from '../ReadonlyCell';
import cfl from '../../../utils/helpers.ts';
import { deleteActionCol } from '../../../utils/columnBuilders';

export interface EditingState {
    rowId: number | null;
    field: string | null;
}

interface Params {
    getString: GetStringFn;
    groupTypes: UserGroupType[];
    editingState: EditingState;
    onEditFieldClick: (row: UserGroup, field: string, e: React.MouseEvent) => void;
    onRequestSave: (row: UserGroup, field: string, newValue: string) => void;
    onCancelEdit: () => void;
    updateIsPending: boolean;
    onToggleProtected: (row: UserGroup) => void;
    toggleIsPending: boolean;
    onEditTypeClick: (row: UserGroup) => void;
    onPermissionSetsClick: (row: UserGroup) => void;
    onDeleteClick: (row: UserGroup) => void;
    deleteIsPending: boolean;
}

export function useUserGroupColumns({
    getString,
    groupTypes,
    editingState,
    onEditFieldClick,
    onRequestSave,
    onCancelEdit,
    updateIsPending,
    onToggleProtected,
    toggleIsPending,
    onEditTypeClick,
    onPermissionSetsClick,
    onDeleteClick,
    deleteIsPending,
}: Params): GridColDef[] {
    function textEditCol(
        field: keyof UserGroup,
        headerKey: string,
        width: number,
        flex?: number,
    ): GridColDef {
        return {
            field: field as string,
            headerName: cfl(getString(headerKey)) || headerKey,
            width: flex ? undefined : width,
            flex,
            renderCell: (params: GridRenderCellParams<UserGroup>) => {
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
                        editTitle={getString(`edit_${field as string}`) || `Edit ${field as string}`}
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
            field: 'user_group_type_id',
            headerName: cfl(getString('groupType')) || 'Type',
            width: 160,
            renderCell: (params: GridRenderCellParams<UserGroup>) => {
                const row = params.row;
                const typeName =
                    groupTypes.find((t) => t.id === row.user_group_type_id)?.name ??
                    String(row.user_group_type_id);
                return (
                    <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
                        <Chip
                            label={typeName}
                            size="small"
                            variant="outlined"
                            color="info"
                            onClick={() => onEditTypeClick(row)}
                            sx={{ cursor: 'pointer' }}
                        />
                    </Box>
                );
            },
        },

        {
            field: 'users_qty',
            headerName: cfl(getString('usersQty')) || 'Users',
            width: 130,
            sortable: false,
            renderCell: (params: GridRenderCellParams<UserGroup>) => {
                const qty = params.row.users_qty;
                if (!qty) return null;
                return (
                    <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center', height: '100%' }}>
                        <Tooltip title={getString('activeUsers') || 'Active'}>
                            <Chip label={qty.active} size="small" color="success" variant="outlined" />
                        </Tooltip>
                        <Tooltip title={getString('inactiveUsers') || 'Inactive'}>
                            <Chip label={qty.inactive} size="small" color="default" variant="outlined" />
                        </Tooltip>
                    </Box>
                );
            },
        },

        {
            field: 'is_protected',
            headerName: cfl(getString('isProtected')) || 'Protected',
            width: 120,
            sortable: false,
            renderCell: (params: GridRenderCellParams<UserGroup>) => {
                const row = params.row;
                return (
                    <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
                        <Tooltip
                            title={
                                row.is_protected
                                    ? getString('protectedGroupHint') ||
                                      'Protected — only visible to protected group members'
                                    : getString('unprotectedGroupHint') || 'Not protected'
                            }
                        >
                            <span>
                                <Switch
                                    size="small"
                                    checked={row.is_protected}
                                    onChange={() => onToggleProtected(row)}
                                    disabled={toggleIsPending}
                                    onClick={(e) => e.stopPropagation()}
                                    icon={<LockIcon sx={{ fontSize: 14 }} />}
                                    checkedIcon={<LockIcon sx={{ fontSize: 14 }} />}
                                />
                            </span>
                        </Tooltip>
                    </Box>
                );
            },
        },

        // ── Permissions button (set grain) ────────────────────────────────────
        {
            field: '_permission_sets',
            headerName: '',
            width: 56,
            sortable: false,
            filterable: false,
            disableColumnMenu: true,
            renderCell: (params: GridRenderCellParams<UserGroup>) => (
                <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
                    <Tooltip title={getString('permissions') || 'Permissions'}>
                        <IconButton
                            size="small"
                            color="primary"
                            onClick={(e) => {
                                e.stopPropagation();
                                onPermissionSetsClick(params.row);
                            }}
                        >
                            <KeyIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                </Box>
            ),
        },

        deleteActionCol<UserGroup>({ getString, onDeleteClick, deleteIsPending }),
    ];
}

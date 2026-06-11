// src/components/planning/usePlanScopeColumns.tsx
import type { GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import { Box, Chip, IconButton, Tooltip } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';

import type { PlanScope } from './planningApi.ts';
import { PlanValueCell } from './PlanValueCell.tsx';
import cfl from '../../utils/helpers.ts';
import type { GetStringFn } from '../../types/getStringFn.ts';

export interface ScopeEditingState {
    rowId: number | null;
}

interface Params {
    getString: GetStringFn;
    editable: boolean; // false when session is not 'open'
    editingState: ScopeEditingState;
    onActivate: (rowId: number) => void;
    onCommit: (row: PlanScope, value: string) => void;
    onCancel: () => void;
    onDeleteClick: (row: PlanScope) => void;
    updateIsPending: boolean;
    deleteIsPending: boolean;
}

export function usePlanScopeColumns({
    getString,
    editable,
    editingState,
    onActivate,
    onCommit,
    onCancel,
    onDeleteClick,
    updateIsPending,
    deleteIsPending,
}: Params): GridColDef[] {
    return [
        {
            field: 'department',
            headerName: cfl(getString('department')) || 'Department',
            flex: 1,
            minWidth: 180,
            sortable: false,
            renderCell: (params: GridRenderCellParams<PlanScope>) =>
                params.row.department?.name ?? `#${params.row.department_id}`,
        },
        {
            field: 'job_group',
            headerName: cfl(getString('jobGroup')) || 'Job group',
            flex: 1,
            minWidth: 160,
            sortable: false,
            renderCell: (params: GridRenderCellParams<PlanScope>) =>
                params.row.job_group?.name ?? `#${params.row.job_group_id}`,
        },
        {
            field: 'talent_status',
            headerName: cfl(getString('talentStatus')) || 'Talent status',
            width: 140,
            sortable: false,
            renderCell: (params: GridRenderCellParams<PlanScope>) => {
                const ts = params.row.talent_status;
                if (!ts) {
                    return (
                        <Chip
                            label={getString('allTalentStatuses') || 'All (combined)'}
                            size="small"
                            variant="outlined"
                        />
                    );
                }
                return <Chip label={ts.key} size="small" color="info" variant="outlined" />;
            },
        },
        {
            field: 'value',
            headerName: cfl(getString('planValue')) || 'Plan value',
            width: 130,
            sortable: false,
            renderCell: (params: GridRenderCellParams<PlanScope>) => (
                <PlanValueCell
                    row={params.row}
                    // editable only when the session is open AND the row is active
                    editable={editable && params.row.is_active}
                    isEditing={editingState.rowId === params.row.id}
                    isPending={updateIsPending}
                    onActivate={onActivate}
                    onCommit={onCommit}
                    onCancel={onCancel}
                    hint={getString('doubleClickToEdit') || 'Double-click to edit (0–100)'}
                />
            ),
        },
        {
            field: 'is_active',
            headerName: cfl(getString('status')) || 'Status',
            width: 110,
            sortable: false,
            renderCell: (params: GridRenderCellParams<PlanScope>) =>
                params.row.is_active ? (
                    <Chip label={getString('active') || 'Active'} size="small" color="success" variant="outlined" />
                ) : (
                    <Chip label={getString('inactive') || 'Inactive'} size="small" color="default" variant="outlined" />
                ),
        },
        {
            field: '_actions',
            headerName: '',
            width: 56,
            sortable: false,
            filterable: false,
            disableColumnMenu: true,
            renderCell: (params: GridRenderCellParams<PlanScope>) => (
                <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
                    <Tooltip title={editable ? (getString('delete') || 'Delete') : (getString('sessionNotOpen') || 'Open the session to edit')}>
                        <span>
                            <IconButton
                                size="small"
                                color="error"
                                onClick={(e) => { e.stopPropagation(); onDeleteClick(params.row); }}
                                disabled={!editable || deleteIsPending}
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

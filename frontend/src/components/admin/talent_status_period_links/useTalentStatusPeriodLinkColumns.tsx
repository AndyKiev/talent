// src/components/admin/talent-status-period-links/useTalentStatusPeriodLinkColumns.tsx
import type { GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import { Box, Chip, Switch } from '@mui/material';

import type { TalentStatusPeriodLink } from './talentStatusPeriodLinkApi';
import type { GetStringFn } from '../../../types/getStringFn';
import cfl from '../../../utils/helpers.ts';
import { formatToUkrDate } from '../../../utils/dateFormatter';
import { deleteActionCol } from '../../../utils/columnBuilders';

interface Params {
    getString: GetStringFn;
    onToggleActive: (row: TalentStatusPeriodLink) => void;
    toggleIsPending: boolean;
    onDeleteClick: (row: TalentStatusPeriodLink) => void;
    deleteIsPending: boolean;
}

export function useTalentStatusPeriodLinkColumns({
                                                     getString,
                                                     onToggleActive,
                                                     toggleIsPending,
                                                     onDeleteClick,
                                                     deleteIsPending,
                                                 }: Params): GridColDef[] {
    return [
        {
            field: 'talent_period',
            headerName: cfl(getString('talentPeriod')) || 'Talent Period',
            flex: 1,
            minWidth: 160,
            valueGetter: (_value: unknown, row: TalentStatusPeriodLink) =>
                row.talent_period?.name ?? '—',
            renderCell: (params: GridRenderCellParams<TalentStatusPeriodLink>) => (
                <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
                    <Chip
                        label={params.row.talent_period?.name ?? '—'}
                        size="small"
                        variant="outlined"
                        color="primary"
                        sx={{ fontWeight: 500 }}
                    />
                </Box>
            ),
        },
        {
            field: 'talent_status',
            headerName: cfl(getString('talentStatus')) || 'Talent Status',
            flex: 1,
            minWidth: 180,
            valueGetter: (_value: unknown, row: TalentStatusPeriodLink) =>
                row.talent_status?.name ?? '—',
            renderCell: (params: GridRenderCellParams<TalentStatusPeriodLink>) => {
                const status = params.row.talent_status;
                return (
                    <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
                        <Chip
                            label={
                                status
                                    ? `${status.key} — ${status.name}`
                                    : '—'
                            }
                            size="small"
                            variant="outlined"
                            color="secondary"
                            sx={{ fontWeight: 500 }}
                        />
                    </Box>
                );
            },
        },
        {
            field: 'is_active',
            headerName: cfl(getString('isActive')) || 'Active',
            width: 110,
            sortable: false,
            renderCell: (params: GridRenderCellParams<TalentStatusPeriodLink>) => (
                <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
                    <Switch
                        size="small"
                        checked={params.row.is_active}
                        onChange={() => onToggleActive(params.row)}
                        disabled={toggleIsPending}
                        onClick={(e) => e.stopPropagation()}
                    />
                </Box>
            ),
        },
        {
            field: 'created_at',
            headerName: cfl(getString('createdAt')) || 'Created At',
            width: 160,
            renderCell: (params: GridRenderCellParams<TalentStatusPeriodLink>) =>
                formatToUkrDate(params.row.created_at),
        },
        deleteActionCol<TalentStatusPeriodLink>({ getString, onDeleteClick, deleteIsPending }),
    ];
}

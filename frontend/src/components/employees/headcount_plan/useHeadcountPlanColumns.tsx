// src/components/employees/headcount_plan/useHeadcountPlanColumns.tsx
import { useMemo } from 'react';
import { Box, Chip, IconButton, Tooltip, Typography } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import PeopleAltOutlinedIcon from '@mui/icons-material/PeopleAltOutlined';
import type { GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import type { HeadcountCalcRow } from './headcountPlanApi';
import type { GetStringFn } from '../../../types/getStringFn';
import cfl from '../../../utils/helpers.ts';

interface Props {
    getString: GetStringFn;
    onPlanClick: (row: HeadcountCalcRow) => void;
    onFactClick: (row: HeadcountCalcRow) => void;
}

export function useHeadcountPlanColumns({
    getString,
    onPlanClick,
    onFactClick,
}: Props): GridColDef[] {
    return useMemo<GridColDef[]>(
        () => [
            {
                field: 'job_name',
                headerName: cfl(getString('job')),
                flex: 1,
                minWidth: 220,
                renderCell: (params: GridRenderCellParams<HeadcountCalcRow>) => (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2">{params.row.job_name}</Typography>
                        {!params.row.link_is_active && (
                            <Chip
                                label={getString('inactive')}
                                size="small"
                                sx={{ fontSize: '0.7rem', height: 20 }}
                            />
                        )}
                    </Box>
                ),
            },
            {
                field: 'plan_qty',
                headerName: cfl(getString('planQty')),
                width: 140,
                sortable: true,
                renderCell: (params: GridRenderCellParams<HeadcountCalcRow>) => (
                    <Tooltip title={getString('planHistoryTitle', { jobName: params.row.job_name })}>
                        <Box
                            onClick={() => onPlanClick(params.row)}
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 0.75,
                                cursor: 'pointer',
                                px: 1,
                                py: 0.25,
                                borderRadius: 1,
                                '&:hover': { bgcolor: 'action.hover', '& svg': { opacity: 1 } },
                            }}
                        >
                            <Typography variant="body2" fontWeight={600}>
                                {params.row.has_plan ? params.row.plan_qty : '—'}
                            </Typography>
                            <EditIcon sx={{ fontSize: 14, opacity: 0.35, transition: 'opacity 0.15s' }} />
                        </Box>
                    </Tooltip>
                ),
            },
            {
                field: 'fact_qty',
                headerName: cfl(getString('factQty')),
                width: 140,
                renderCell: (params: GridRenderCellParams<HeadcountCalcRow>) => {
                    const { fact_qty, fact_pending_qty } = params.row;
                    return (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Typography variant="body2">{fact_qty}</Typography>
                            {fact_pending_qty > 0 && (
                                <Tooltip
                                    title={getString('factPendingHint', {
                                        pending: fact_pending_qty,
                                        fact: fact_qty,
                                    })}
                                >
                                    <Typography
                                        variant="body2"
                                        component="span"
                                        sx={{ color: 'warning.main', fontWeight: 600 }}
                                    >
                                        ({fact_pending_qty})
                                    </Typography>
                                </Tooltip>
                            )}
                            <Tooltip title={getString('employees')}>
                                <span>
                                    <IconButton
                                        size="small"
                                        disabled={fact_qty === 0}
                                        onClick={() => onFactClick(params.row)}
                                    >
                                        <PeopleAltOutlinedIcon sx={{ fontSize: 16 }} />
                                    </IconButton>
                                </span>
                            </Tooltip>
                        </Box>
                    );
                },
            },
            {
                field: 'diff',
                headerName: cfl(getString('headcountDiff')),
                width: 140,
                sortable: false,
                renderCell: (params: GridRenderCellParams<HeadcountCalcRow>) => {
                    if (!params.row.has_plan) return null;
                    const diff = params.row.fact_qty - params.row.plan_qty;
                    return (
                        <Chip
                            label={diff > 0 ? `+${diff}` : String(diff)}
                            size="small"
                            color={diff === 0 ? 'success' : diff < 0 ? 'warning' : 'info'}
                            sx={{ fontWeight: 600, minWidth: 44 }}
                        />
                    );
                },
            },
        ],
        [getString, onPlanClick, onFactClick],
    );
}

import { Badge, Box, Chip, IconButton, Stack, Tooltip, Typography } from '@mui/material';
import CommentIcon from '@mui/icons-material/Comment';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import HistoryIcon from '@mui/icons-material/History';
import type { GridColDef } from '@mui/x-data-grid';
import type { Mission } from './missionApi';
import { formatMissionDate, isMissionExpired, missionProgress } from './missionHelpers';
import type { GetStringFn } from '../../types/getStringFn';

interface Options {
    /** Receives getString as a callback — hooks/helpers never call useString
     *  themselves (rules of hooks + the project convention). */
    getString: GetStringFn;
    canManage: boolean;
    canViewHistory: boolean;
    onEdit: (mission: Mission) => void;
    onDelete: (mission: Mission) => void;
    onOpenComments: (mission: Mission) => void;
    onOpenHistory: (mission: Mission) => void;
}

/** Shared dimming for every cell of an INACTIVE row — expired OR accomplished,
 *  since both free a slot under mission_max_active. Theme-aware: opacity plus
 *  the theme's own secondary text colour, never a hardcoded grey. */
function cellSx(dimmed: boolean) {
    return { opacity: dimmed ? 0.6 : 1, color: dimmed ? 'text.secondary' : 'text.primary' };
}

export function useMissionColumns({
    getString,
    canManage,
    canViewHistory,
    onEdit,
    onDelete,
    onOpenComments,
    onOpenHistory,
}: Options): GridColDef<Mission>[] {
    return [
        {
            field: 'text',
            headerName: getString('missionText'),
            flex: 2,
            minWidth: 220,
            renderCell: (params) => {
                const dimmed = !params.row.is_active;
                return (
                    <Typography variant="body2" sx={{ ...cellSx(dimmed), whiteSpace: 'normal' }}>
                        {params.row.text}
                    </Typography>
                );
            },
        },
        {
            field: 'dimension_name',
            headerName: getString('missionCompetence'),
            flex: 1,
            minWidth: 150,
            renderCell: (params) =>
                params.row.dimension_name ? (
                    <Chip
                        size="small"
                        label={params.row.dimension_name}
                        variant="outlined"
                        sx={{
                            color: params.row.dimension_color ?? undefined,
                            borderColor: params.row.dimension_color ?? undefined,
                            fontWeight: 600,
                            opacity: params.row.is_active ? 1 : 0.6,
                        }}
                    />
                ) : (
                    <Typography variant="body2" color="text.secondary">
                        —
                    </Typography>
                ),
        },
        {
            field: 'start_date',
            headerName: getString('missionStartDate'),
            width: 130,
            renderCell: (params) => (
                <Typography variant="body2" sx={cellSx(!params.row.is_active)}>
                    {formatMissionDate(params.row.start_date)}
                </Typography>
            ),
        },
        {
            field: 'end_date',
            headerName: getString('missionEndDate'),
            width: 130,
            renderCell: (params) => {
                const { is_active: active, is_accomplished: done } = params.row;
                const hint = done
                    ? getString('missionAccomplished')
                    : isMissionExpired(params.row.end_date)
                      ? getString('missionExpired')
                      : '';
                return (
                    <Tooltip title={hint}>
                        <Typography variant="body2" sx={cellSx(!active)}>
                            {formatMissionDate(params.row.end_date)}
                        </Typography>
                    </Tooltip>
                );
            },
        },
        {
            field: 'kpis',
            headerName: getString('kpiPercent'),
            width: 120,
            sortable: false,
            renderCell: (params) => (
                <Typography variant="body2" sx={cellSx(!params.row.is_active)}>
                    {missionProgress(params.row.kpis)}% ({params.row.kpis.length})
                </Typography>
            ),
        },
        {
            field: 'actions',
            headerName: '',
            width: canManage ? 170 : 100,
            sortable: false,
            filterable: false,
            renderCell: (params) => (
                <Box>
                    <Stack direction="row">
                        <Tooltip title={getString('missionComments')}>
                            <IconButton size="small" onClick={() => onOpenComments(params.row)}>
                                <Badge
                                    badgeContent={params.row.comments.length}
                                    color="primary"
                                    overlap="circular"
                                >
                                    <CommentIcon fontSize="small" />
                                </Badge>
                            </IconButton>
                        </Tooltip>
                        {canViewHistory && (
                            <Tooltip title={getString('missionHistory')}>
                                <IconButton size="small" onClick={() => onOpenHistory(params.row)}>
                                    <HistoryIcon fontSize="small" />
                                </IconButton>
                            </Tooltip>
                        )}
                        {canManage && (
                            <>
                                <Tooltip title={getString('editMission')}>
                                    <IconButton size="small" onClick={() => onEdit(params.row)}>
                                        <EditIcon fontSize="small" />
                                    </IconButton>
                                </Tooltip>
                                <Tooltip title={getString('deleteMission')}>
                                    <IconButton size="small" onClick={() => onDelete(params.row)}>
                                        <DeleteIcon fontSize="small" />
                                    </IconButton>
                                </Tooltip>
                            </>
                        )}
                    </Stack>
                </Box>
            ),
        },
    ];
}

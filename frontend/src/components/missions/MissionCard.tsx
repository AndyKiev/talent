import {
    Badge,
    Box,
    Card,
    CardContent,
    Chip,
    IconButton,
    Stack,
    Tooltip,
    Typography,
} from '@mui/material';
import CommentIcon from '@mui/icons-material/Comment';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import HistoryIcon from '@mui/icons-material/History';
import type { Mission, MissionKpi } from './missionApi';
import { formatMissionPeriod, isMissionExpired, missionProgress } from './missionHelpers';
import { MissionKpiList } from './MissionKpiList';
import type { GetStringFn } from '../../types/getStringFn';

interface Props {
    mission: Mission;
    canManage: boolean;
    canViewHistory: boolean;
    kpiMaxLength: number;
    getString: GetStringFn;
    onEdit: () => void;
    onDelete: () => void;
    onOpenComments: () => void;
    onOpenHistory: () => void;
    onAddKpi: (text: string) => void;
    onUpdateKpiText: (kpiId: number, text: string) => void;
    onDeleteKpi: (kpiId: number) => void;
    onSetKpiPercent: (kpi: MissionKpi) => void;
}

export function MissionCard({
    mission,
    canManage,
    canViewHistory,
    kpiMaxLength,
    getString,
    onEdit,
    onDelete,
    onOpenComments,
    onOpenHistory,
    onAddKpi,
    onUpdateKpiText,
    onDeleteKpi,
    onSetKpiPercent,
}: Props) {
    // Dim anything no longer active — expired OR finished. Both free a slot
    // under mission_max_active, so both should read as background material.
    const expired = isMissionExpired(mission.end_date);
    const dimmed = !mission.is_active;
    const progress = missionProgress(mission.kpis);

    return (
        <Card
            variant="outlined"
            sx={{
                height: '100%',
                // Expired missions read as background material. Opacity + the
                // theme's own disabled/secondary text colours rather than a fixed
                // grey, which would vanish in one of the two themes.
                opacity: dimmed ? 0.6 : 1,
                borderStyle: dimmed ? 'dashed' : 'solid',
            }}
        >
            <CardContent>
                <Stack direction="row" spacing={1} alignItems="flex-start" sx={{ mb: 1 }}>
                    <Box sx={{ flex: 1 }}>
                        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                            {mission.dimension_name && (
                                <Chip
                                    size="small"
                                    label={mission.dimension_name}
                                    variant="outlined"
                                    sx={{
                                        color: mission.dimension_color ?? undefined,
                                        borderColor: mission.dimension_color ?? undefined,
                                        fontWeight: 600,
                                    }}
                                />
                            )}
                            {mission.is_accomplished && (
                                <Chip
                                    size="small"
                                    label={getString('missionAccomplished')}
                                    variant="outlined"
                                    color="success"
                                />
                            )}
                            {expired && !mission.is_accomplished && (
                                <Chip
                                    size="small"
                                    label={getString('missionExpired')}
                                    variant="outlined"
                                    color="default"
                                />
                            )}
                        </Stack>
                        <Typography
                            variant="body2"
                            sx={{
                                mt: 0.75,
                                whiteSpace: 'pre-wrap',
                                wordBreak: 'break-word',
                                color: dimmed ? 'text.secondary' : 'text.primary',
                            }}
                        >
                            {mission.text}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            {getString('missionPeriod')}:{' '}
                            {formatMissionPeriod(mission.start_date, mission.end_date)} · {progress}%
                        </Typography>
                    </Box>

                    <Stack direction="row">
                        <Tooltip title={getString('missionComments')}>
                            <IconButton size="small" onClick={onOpenComments}>
                                <Badge
                                    badgeContent={mission.comments.length}
                                    color="primary"
                                    overlap="circular"
                                >
                                    <CommentIcon fontSize="small" />
                                </Badge>
                            </IconButton>
                        </Tooltip>
                        {canViewHistory && (
                            <Tooltip title={getString('missionHistory')}>
                                <IconButton size="small" onClick={onOpenHistory}>
                                    <HistoryIcon fontSize="small" />
                                </IconButton>
                            </Tooltip>
                        )}
                        {canManage && (
                            <>
                                <Tooltip title={getString('editMission')}>
                                    <IconButton size="small" onClick={onEdit}>
                                        <EditIcon fontSize="small" />
                                    </IconButton>
                                </Tooltip>
                                <Tooltip title={getString('deleteMission')}>
                                    <IconButton size="small" onClick={onDelete}>
                                        <DeleteIcon fontSize="small" />
                                    </IconButton>
                                </Tooltip>
                            </>
                        )}
                    </Stack>
                </Stack>

                <MissionKpiList
                    kpis={mission.kpis}
                    canManage={canManage}
                    kpiMaxLength={kpiMaxLength}
                    getString={getString}
                    dimmed={dimmed}
                    onAdd={onAddKpi}
                    onUpdateText={onUpdateKpiText}
                    onDelete={onDeleteKpi}
                    onSetPercent={onSetKpiPercent}
                />
            </CardContent>
        </Card>
    );
}

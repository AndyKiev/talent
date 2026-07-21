import { useQuery } from '@tanstack/react-query';
import {
    Box,
    Button,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Stack,
    Typography,
} from '@mui/material';
import dayjs from 'dayjs';
import { fetchEmployeeMissionHistory, fetchMissionHistory } from './missionApi';
import { EMPLOYEE_MISSION_HISTORY_QK, MISSION_HISTORY_QK } from '../../utils/queryKeys';
import { DATE_FORMAT } from '../../utils/eNums';
import type { GetStringFn } from '../../types/getStringFn';

interface Props {
    open: boolean;
    /** One mission's trail. Mutually exclusive with employeeId. */
    missionId?: number | null;
    /** The employee's WHOLE trail, deleted missions included. */
    employeeId?: number | null;
    getString: GetStringFn;
    onClose: () => void;
}

/** '—' for a null side of a change pair, so "set from nothing" reads clearly. */
function sideLabel(value: string | number | null): string {
    return value === null || value === undefined || value === '' ? '—' : String(value);
}

/**
 * The mission + KPI change trail (who, when, what).
 *
 * Two scopes share this component:
 *  - `missionId` — one mission, opened from its row;
 *  - `employeeId` — everything for that employee, which is the only view that
 *    still shows DELETED missions (their row is gone, so nothing is left to
 *    click, but the change_log entries survive and carry the old text).
 *
 * Served by purpose-built endpoints behind the employee_mission_history essence
 * — deliberately NOT the generic /audit/change_logs, which is admin-only and
 * would expose the entire system audit trail to HR.
 */
export function MissionHistoryDialog({
    open,
    missionId,
    employeeId,
    getString,
    onClose,
}: Props) {
    const byEmployee = employeeId != null;

    const { data: entries = [], isLoading } = useQuery({
        queryKey: byEmployee
            ? EMPLOYEE_MISSION_HISTORY_QK(employeeId as number)
            : MISSION_HISTORY_QK(missionId ?? 0),
        queryFn: () =>
            byEmployee
                ? fetchEmployeeMissionHistory(employeeId as number)
                : fetchMissionHistory(missionId as number),
        enabled: open && (byEmployee || missionId != null),
    });

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>
                {getString(byEmployee ? 'missionHistoryAll' : 'missionHistory')}
                {byEmployee && (
                    <Typography variant="caption" color="text.secondary" display="block">
                        {getString('missionHistoryAllHint')}
                    </Typography>
                )}
            </DialogTitle>
            <DialogContent>
                {!isLoading && entries.length === 0 && (
                    <Typography variant="body2" color="text.secondary">
                        {getString('missionHistoryEmpty')}
                    </Typography>
                )}
                <Stack spacing={2}>
                    {entries.map((entry) => {
                        const isDelete = entry.action === 'delete';
                        return (
                            <Box key={entry.id}>
                                <Stack
                                    direction="row"
                                    spacing={1}
                                    alignItems="center"
                                    flexWrap="wrap"
                                >
                                    <Chip
                                        size="small"
                                        label={entry.action}
                                        variant="outlined"
                                        color={isDelete ? 'error' : 'default'}
                                    />
                                    <Typography variant="caption" color="text.secondary">
                                        {entry.entity_kind}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        · {entry.actor_name ?? '—'} ·{' '}
                                        {dayjs(entry.changed_at).format(`${DATE_FORMAT} HH:mm`)}
                                    </Typography>
                                </Stack>
                                {entry.changes && (
                                    <Stack sx={{ pl: 1, mt: 0.5 }}>
                                        {Object.entries(entry.changes).map(([field, pair]) => (
                                            <Typography key={field} variant="body2">
                                                <Box component="span" fontWeight={600}>
                                                    {field}
                                                </Box>
                                                : {sideLabel(pair.old)} → {sideLabel(pair.new)}
                                            </Typography>
                                        ))}
                                    </Stack>
                                )}
                            </Box>
                        );
                    })}
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} sx={{ textTransform: 'none' }}>
                    {getString('cancel')}
                </Button>
            </DialogActions>
        </Dialog>
    );
}

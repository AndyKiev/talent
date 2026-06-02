// src/components/employees/DrHistoryTab.tsx
import { useParams } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { Paper, Typography, Stack, Chip, Box, Divider, CircularProgress } from '@mui/material';
import {
    fetchResponsibilityHistory,
    type ResponsibilityHistoryEntry,
} from './employee_events/employeeEventApi';
import useString from '../../hooks/useString';
import str from '../../strings/str';
import cfl from '../../utils/helpers.ts';
import { formatToUkrDate } from '../../utils/dateFormatter';

export function DrHistoryTab() {
    const { employeeId } = useParams({ from: '/employees/$employeeId/dr_history/' });
    const id = Number(employeeId);
    const getString = useString({ str });

    const { data: history = [], isLoading } = useQuery<ResponsibilityHistoryEntry[]>({
        queryKey: ['responsibility-history', id],
        queryFn: () => fetchResponsibilityHistory(id),
        staleTime: 2 * 60 * 1000,
    });

    if (isLoading) {
        return (
            <Paper variant="outlined" sx={{ p: 3, textAlign: 'center' }}>
                <CircularProgress size={24} />
            </Paper>
        );
    }

    if (history.length === 0) {
        return (
            <Paper variant="outlined" sx={{ p: 3 }}>
                <Typography color="text.secondary">
                    {cfl(getString('noResponsibilityHistory') || 'No responsibility history yet')}
                </Typography>
            </Paper>
        );
    }

    return (
        <Paper variant="outlined" sx={{ p: 2 }}>
            <Stack divider={<Divider />} spacing={2}>
                {history.map((entry, idx) => (
                    <Box key={idx}>
                        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                            <Typography variant="subtitle2">
                                {formatToUkrDate(entry.effective_date)}
                            </Typography>
                            {entry.event_type && (
                                <Chip label={entry.event_type} size="small" variant="outlined" />
                            )}
                        </Stack>
                        <Stack direction="row" spacing={0.5} flexWrap="wrap">
                            {entry.departments.map((d) => (
                                <Chip key={d.id} label={d.name ?? `#${d.id}`} size="small" variant="outlined" />
                            ))}
                        </Stack>
                    </Box>
                ))}
            </Stack>
        </Paper>
    );
}
